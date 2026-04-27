import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

// Mirrors the schema on the screening form on the frontend; AUM is a
// dropdown of fixed bands rather than free text so the manual review
// process can sort by capital scale without normalising free-form input.
const waitlistSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    institution: z.string().min(2, 'Institution name required').optional(),
    aum: z.string().min(1, 'AUM band required').optional(),
    source: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

export const submitWaitlist = async (req: Request, res: Response) => {
    try {
        const validatedData = waitlistSchema.parse(req.body);
        const ipAddress =
            req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
            req.socket.remoteAddress ||
            null;
        const userAgent = req.headers['user-agent'] || null;

        // Upsert keeps re-submissions idempotent — applicants who fill
        // the form twice end up with one row, latest details winning,
        // and don't see a duplicate-key error masquerading as a 500.
        const entry = await prisma.waitlistEntry.upsert({
            where: { email: validatedData.email },
            create: {
                email: validatedData.email,
                fullName: validatedData.fullName,
                institution: validatedData.institution ?? null,
                aum: validatedData.aum ?? null,
                source: validatedData.source ?? 'waitlist',
                userAgent,
                ipAddress,
                metadata: validatedData.metadata ?? {},
            },
            update: {
                fullName: validatedData.fullName,
                institution: validatedData.institution ?? null,
                aum: validatedData.aum ?? null,
                source: validatedData.source ?? 'waitlist',
                userAgent,
                ipAddress,
                metadata: validatedData.metadata ?? {},
            },
        });

        res.status(201).json({
            success: true,
            message: "You're on the list. We'll be in touch.",
            data: { id: entry.id, email: entry.email, createdAt: entry.createdAt },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                errors: error.errors.map((err) => ({
                    field: err.path[0],
                    message: err.message,
                })),
            });
            return;
        }

        console.error('Waitlist submission error:', error);
        res.status(500).json({
            success: false,
            message: 'An internal server error occurred. Please try again later.',
        });
    }
};

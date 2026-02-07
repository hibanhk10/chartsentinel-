import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

const contactSchema = z.object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    message: z.string().min(10, 'Message (complaint) must be at least 10 characters long'),
});

export const submitContactForm = async (req: Request, res: Response) => {
    try {
        const validatedData = contactSchema.parse(req.body);

        const contactMessage = await prisma.contactMessage.create({
            data: {
                fullName: validatedData.fullName,
                email: validatedData.email,
                message: validatedData.message,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Thank you for your message. We will get back to you soon.',
            data: contactMessage,
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

        console.error('Contact form submission error:', error);
        res.status(500).json({
            success: false,
            message: 'An internal server error occurred. Please try again later.',
        });
    }
};

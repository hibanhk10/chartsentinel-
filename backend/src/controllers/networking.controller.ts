import { Request, Response } from 'express';
import { z } from 'zod';
import { networkingService } from '../services/networking.service';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

// Opt-in payload. Two valid shapes:
//   { optIn: false } — clears the public footprint
//   { optIn: true, displayName, lat, lng, ... } — enables / updates it
//
// We require lat/lng (not just city name) because the frontend's curated
// city picker already supplies them — that lets us avoid a server-side
// geocoder, which is both an external dependency and a vector for users
// pinning themselves to invalid coordinates.
const optInTrueSchema = z.object({
  optIn: z.literal(true),
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(32, 'Display name must be at most 32 characters')
    // Keep handles simple so they render predictably in the popup. No
    // emojis, no zero-width tricks, no leading @.
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9 _.-]*$/, 'Display name has invalid characters'),
  roleTag: z.string().trim().max(24).optional().nullable(),
  city: z.string().trim().min(1).max(80),
  country: z.string().trim().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const optInFalseSchema = z.object({
  optIn: z.literal(false),
});

const locationSchema = z.discriminatedUnion('optIn', [
  optInTrueSchema,
  optInFalseSchema,
]);

export const listMembersController = async (_req: AuthRequest, res: Response) => {
  const members = await networkingService.listPublicMembers();
  res.json({ members });
};

export const getMyLocationController = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorised' });
    return;
  }
  const location = await networkingService.getMyLocation(req.user.id);
  res.json({ location });
};

export const updateMyLocationController = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorised' });
    return;
  }
  try {
    const body = locationSchema.parse(req.body);
    const location = await networkingService.updateMyLocation(req.user.id, body);
    res.json({ location });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Invalid input.' });
      return;
    }
    throw error;
  }
};

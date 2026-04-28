import prisma from '../config/db';

export interface LocationInput {
  optIn: boolean;
  displayName?: string | null;
  roleTag?: string | null;
  city?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export const networkingService = {
  // Public roster — only members who have explicitly opted in AND have
  // the minimum fields needed to render a map pin. We never expose
  // emails or any other identifier the user did not consent to publish.
  async listPublicMembers() {
    const members = await prisma.user.findMany({
      where: {
        locationOptIn: true,
        displayName: { not: null },
        lat: { not: null },
        lng: { not: null },
      },
      select: {
        id: true,
        displayName: true,
        roleTag: true,
        city: true,
        country: true,
        lat: true,
        lng: true,
      },
      take: 5000, // hard cap so a misbehaving caller can't OOM the API
    });
    return members.map((m) => ({
      handle: m.displayName,
      city: m.city && m.country ? `${m.city}, ${m.country}` : m.city || '',
      role: m.roleTag || 'Member',
      lat: m.lat,
      lng: m.lng,
    }));
  },

  async getMyLocation(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        displayName: true,
        roleTag: true,
        city: true,
        country: true,
        lat: true,
        lng: true,
        locationOptIn: true,
      },
    });
    return user;
  },

  // Apply user-provided location settings. Caller is responsible for
  // having validated the input (zod in the controller). Opting out
  // clears the spatial fields so a member who toggles off doesn't have
  // stale lat/lng lingering in the DB; opting in requires a complete
  // record (enforced at the controller layer).
  async updateMyLocation(userId: string, input: LocationInput) {
    if (!input.optIn) {
      return prisma.user.update({
        where: { id: userId },
        data: {
          locationOptIn: false,
          // Keep displayName so the user doesn't have to re-enter it on
          // the next opt-in. Coordinates / city are cleared because they
          // are the bits that constitute the public footprint.
          city: null,
          country: null,
          lat: null,
          lng: null,
        },
        select: {
          displayName: true,
          roleTag: true,
          city: true,
          country: true,
          lat: true,
          lng: true,
          locationOptIn: true,
        },
      });
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        locationOptIn: true,
        displayName: input.displayName ?? null,
        roleTag: input.roleTag ?? null,
        city: input.city ?? null,
        country: input.country ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
      },
      select: {
        displayName: true,
        roleTag: true,
        city: true,
        country: true,
        lat: true,
        lng: true,
        locationOptIn: true,
      },
    });
  },
};

import crypto from 'crypto';
import prisma from '../config/db';

// Human-readable codes: 3-letter prefix + 4 alphanumerics. Avoids ambiguous
// characters (0/O, 1/I/L) so "typed from a phone screenshot" just works.
// 32^4 = ~1M suffix space per prefix; with per-user uniqueness and retry on
// collision, we don't run out of codes.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCodeSuffix(len = 4): string {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

function prefixFromEmail(email: string): string {
  const local = email.split('@')[0] || 'user';
  const letters = local.replace(/[^A-Za-z]/g, '').toUpperCase();
  return (letters.slice(0, 3) || 'CS').padEnd(3, 'X');
}

async function generateUniqueCode(email: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${prefixFromEmail(email)}-${generateCodeSuffix()}`;
    const existing = await prisma.referralCode.findUnique({ where: { code: candidate } });
    if (!existing) return candidate;
  }
  // Extremely unlikely — fall back to a longer suffix to guarantee termination.
  return `${prefixFromEmail(email)}-${generateCodeSuffix(8)}`;
}

export const referralService = {
  // Lazy-create: most users never share; only build a code when they open
  // the share UI. `upsert` so repeated dashboard visits are idempotent.
  async getOrCreateForUser(userId: string) {
    const existing = await prisma.referralCode.findUnique({
      where: { userId },
      include: { redemptions: true },
    });
    if (existing) return existing;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const code = await generateUniqueCode(user.email);
    return prisma.referralCode.create({
      data: { code, userId },
      include: { redemptions: true },
    });
  },

  // Called from the register flow when a new user arrives with a ?ref code.
  // Silent on unknown / self / already-redeemed codes so we never block
  // registration on a bad referral URL.
  async attributeRegistration(referredUserId: string, rawCode: string | null | undefined) {
    if (!rawCode) return;

    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    const referralCode = await prisma.referralCode.findUnique({ where: { code } });
    if (!referralCode) return;
    if (referralCode.userId === referredUserId) return; // self-referrals don't count

    try {
      await prisma.$transaction([
        prisma.referralRedemption.create({
          data: {
            codeId: referralCode.id,
            referrerId: referralCode.userId,
            referredUserId,
          },
        }),
        prisma.referralCode.update({
          where: { id: referralCode.id },
          data: { usageCount: { increment: 1 } },
        }),
      ]);
    } catch (err) {
      // Unique constraint on (referredUserId) means the user was already
      // attributed — swallow, don't fail registration.
      console.error('[referral] attribution skipped:', err);
    }
  },

  // Called when a referred user becomes a paying customer. Flips the
  // `rewardGrantedAt` column so the billing side can issue a free-month
  // Stripe coupon idempotently (coupon application itself lives in the
  // payment controller so it stays close to Stripe).
  async markRewardEligible(referredUserId: string) {
    return prisma.referralRedemption.updateMany({
      where: { referredUserId, rewardGrantedAt: null },
      data: { rewardGrantedAt: new Date() },
    });
  },
};

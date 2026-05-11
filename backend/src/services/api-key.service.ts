import crypto from 'node:crypto';
import prisma from '../config/db';

// API key minting + verification. The plaintext key is surfaced once
// at creation time; only the sha256 hash is persisted, so a DB leak
// can't be turned into live access. Prefix is the first 12 chars of
// the plaintext kept clear so the dashboard can render "cs_live_…"
// in the keys list.
//
// Format: cs_live_<base32 noise>. The `cs_live_` prefix makes leaked
// keys grep-able in logs / git history (à la Stripe's sk_live_).

const KEY_PREFIX = 'cs_live_';

function hashKey(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

function generatePlaintext(): string {
  // 30 bytes → 48 base64url chars; trimmed to 32 for readability.
  const noise = crypto.randomBytes(30).toString('base64url').slice(0, 32);
  return `${KEY_PREFIX}${noise}`;
}

export interface CreatedApiKey {
  id: string;
  plaintext: string; // shown to the user exactly once
  prefix: string;
  label: string;
  createdAt: Date;
}

export async function createApiKey(userId: string, label: string): Promise<CreatedApiKey> {
  const plaintext = generatePlaintext();
  const hashedKey = hashKey(plaintext);
  const prefix = plaintext.slice(0, 12);
  const row = await prisma.apiKey.create({
    data: { userId, hashedKey, prefix, label: label.trim() || 'Default' },
  });
  return { id: row.id, plaintext, prefix, label: row.label, createdAt: row.createdAt };
}

export interface ListedApiKey {
  id: string;
  prefix: string;
  label: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export async function listApiKeys(userId: string): Promise<ListedApiKey[]> {
  const rows = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, prefix: true, label: true, createdAt: true, lastUsedAt: true },
  });
  return rows;
}

export async function revokeApiKey(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.apiKey.deleteMany({ where: { userId, id } });
  return count > 0;
}

// Verifies a plaintext key and stamps lastUsedAt. Returns the owning
// user record (id + plan) or null if the key is unknown or invalid.
export async function verifyApiKey(plaintext: string | undefined | null) {
  if (!plaintext || !plaintext.startsWith(KEY_PREFIX)) return null;
  const hashedKey = hashKey(plaintext);
  const row = await prisma.apiKey.findUnique({
    where: { hashedKey },
    select: {
      id: true,
      userId: true,
      user: { select: { id: true, email: true, role: true, plan: true } },
    },
  });
  if (!row) return null;
  // Fire-and-forget; we don't want auth latency to depend on the write.
  prisma.apiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return row.user;
}

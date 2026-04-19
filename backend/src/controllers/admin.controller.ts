import { Request, Response } from 'express';
import prisma from '../config/db';

// Admin-only overview endpoints. Guarded by the admin middleware at the
// route layer, so the controllers can trust req.user.role === 'admin' here.

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

const dayAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export const overviewController = async (_req: AuthRequest, res: Response) => {
  const [
    totalUsers,
    paidUsers,
    totalSubscribers,
    totalContactMessages,
    totalReports,
    totalNews,
    totalWatchlistItems,
    newUsers24h,
    newUsers7d,
    newUsers30d,
    newSubs24h,
    newContact24h,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isPaid: true } }),
    prisma.newsletterSubscriber.count(),
    prisma.contactMessage.count(),
    prisma.report.count(),
    prisma.news.count(),
    prisma.watchlistItem.count(),
    prisma.user.count({ where: { createdAt: { gte: dayAgo(1) } } }),
    prisma.user.count({ where: { createdAt: { gte: dayAgo(7) } } }),
    prisma.user.count({ where: { createdAt: { gte: dayAgo(30) } } }),
    prisma.newsletterSubscriber.count({ where: { createdAt: { gte: dayAgo(1) } } }),
    prisma.contactMessage.count({ where: { createdAt: { gte: dayAgo(1) } } }),
  ]);

  // Paid conversion rate — null when we have no users so the UI can show
  // "—" instead of NaN% on an empty database.
  const paidConversion = totalUsers > 0 ? paidUsers / totalUsers : null;

  // Last 5 signups, subscribers, messages for an at-a-glance ops view.
  const [recentUsers, recentSubs, recentMessages] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, email: true, isPaid: true, createdAt: true },
    }),
    prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, email: true, createdAt: true },
    }),
    prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, fullName: true, email: true, createdAt: true },
    }),
  ]);

  res.json({
    counters: {
      totalUsers,
      paidUsers,
      totalSubscribers,
      totalContactMessages,
      totalReports,
      totalNews,
      totalWatchlistItems,
      paidConversion,
    },
    recent: {
      signups24h: newUsers24h,
      signups7d: newUsers7d,
      signups30d: newUsers30d,
      subscribers24h: newSubs24h,
      contact24h: newContact24h,
    },
    lists: {
      users: recentUsers,
      subscribers: recentSubs,
      messages: recentMessages,
    },
  });
};

// --- CSV exports -----------------------------------------------------------

// Minimal, RFC 4180-ish CSV: quote every field, escape embedded quotes by
// doubling them, join fields with commas and rows with CRLF. Handles the
// three export surfaces we actually need right now (users, subscribers,
// contact messages). If we grow this further, move into a shared util.
function csvEscape(value: unknown): string {
  if (value == null) return '""';
  const str = value instanceof Date ? value.toISOString() : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const head = headers.map(csvEscape).join(',');
  const body = rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
  return `${head}\r\n${body}\r\n`;
}

function sendCsv(res: Response, filename: string, body: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(body);
}

export const exportUsersController = async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, role: true, isPaid: true, createdAt: true },
  });

  const csv = toCsv(
    ['id', 'email', 'role', 'isPaid', 'createdAt'],
    users.map((u) => [u.id, u.email, u.role, u.isPaid, u.createdAt]),
  );

  sendCsv(res, `chartsentinel-users-${new Date().toISOString().slice(0, 10)}.csv`, csv);
};

export const exportSubscribersController = async (_req: AuthRequest, res: Response) => {
  const subs = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, createdAt: true },
  });

  const csv = toCsv(
    ['id', 'email', 'createdAt'],
    subs.map((s) => [s.id, s.email, s.createdAt]),
  );

  sendCsv(res, `chartsentinel-subscribers-${new Date().toISOString().slice(0, 10)}.csv`, csv);
};

export const exportMessagesController = async (_req: AuthRequest, res: Response) => {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, fullName: true, email: true, message: true, createdAt: true },
  });

  const csv = toCsv(
    ['id', 'fullName', 'email', 'message', 'createdAt'],
    messages.map((m) => [m.id, m.fullName, m.email, m.message, m.createdAt]),
  );

  sendCsv(res, `chartsentinel-messages-${new Date().toISOString().slice(0, 10)}.csv`, csv);
};

import prisma from '../config/db';

// In-app alert feed. Inserted by the watchlist alert cron whenever a
// composite score crosses a user's threshold, read by the dashboard
// notifications bell. Independent of the email / Telegram / webhook
// delivery paths — those are external, this is just for the UI.

export interface AlertEventInput {
  userId: string;
  ticker: string;
  direction: 'above' | 'below';
  threshold: number;
  score: number;
}

export async function recordAlertEvent(input: AlertEventInput) {
  return prisma.alertEvent.create({ data: input });
}

export async function listRecentAlerts(userId: string, limit = 40) {
  return prisma.alertEvent.findMany({
    where: { userId },
    orderBy: { triggeredAt: 'desc' },
    take: limit,
  });
}

export async function countUnread(userId: string) {
  return prisma.alertEvent.count({ where: { userId, readAt: null } });
}

export async function markAllRead(userId: string) {
  await prisma.alertEvent.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

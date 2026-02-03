import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding data...');

    // Seed News
    const news1 = await prisma.news.upsert({
        where: { id: 'test-news-1' },
        update: {},
        create: {
            id: 'test-news-1',
            title: 'Market Analysis: Q1 Outlook',
            content: 'The market is showing strong signals for currency pairs. We expect high volatility in the coming weeks due to central bank interest rate decisions.',
        },
    });

    const news2 = await prisma.news.upsert({
        where: { id: 'test-news-2' },
        update: {},
        create: {
            id: 'test-news-2',
            title: 'Crypto Alert: BTC Resistance',
            content: 'Bitcoin is testing major resistance levels. Our analysis suggests a potential breakout if momentum continues, but caution is advised near horizontal levels.',
        },
    });

    // Seed Reports
    const report1 = await prisma.report.upsert({
        where: { id: 'test-report-1' },
        update: {},
        create: {
            id: 'test-report-1',
            title: 'Weekly Forex Breakdown',
            summary: 'Deep dive into EUR/USD and GBP/JPY trends.',
            content: 'Detailed analysis of major forex pairs with key support and resistance zones identified for the week of February 2nd.',
        },
    });

    const report2 = await prisma.report.upsert({
        where: { id: 'test-report-2' },
        update: {},
        create: {
            id: 'test-report-2',
            title: 'Institutional Flow Report',
            summary: 'Monitoring big money moves in the equity markets.',
            content: 'Internal analysis of institutional volume patterns. We are seeing significant accumulation in tech stocks despite broader market uncertainty.',
        },
    });

    console.log('Seeding complete:', { newsCount: 2, reportsCount: 2 });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

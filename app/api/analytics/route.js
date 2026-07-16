import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { ADMIN_CACHE_HEADER, requireAdmin } from '../../../lib/api-security';

export async function GET(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const [totalPrompts, totalUsers, totalSaves, promptCopies] = await Promise.all([
      prisma.prompt.count(),
      prisma.user.count(),
      prisma.save.count(),
      prisma.prompt.aggregate({ _sum: { copies: true } })
    ]);

    // Top Prompts
    const topPrompts = await prisma.prompt.findMany({
      orderBy: { copies: 'desc' },
      take: 4,
    });

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    
    // Time Series
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0,0,0,0);
    
    const recentEvents = await prisma.analyticsEvent.findMany({
        where: { eventType: 'copy_prompt', createdAt: { gte: startDate } }
    });
    
    // Group by day string
    const timeSeriesMap = {};
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        timeSeriesMap[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
    }
    
    recentEvents.forEach(e => {
        const dayStr = e.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (timeSeriesMap[dayStr] !== undefined) {
            timeSeriesMap[dayStr]++;
        }
    });

    const timeSeries = Object.keys(timeSeriesMap).reverse().map(date => ({
        date,
        copies: timeSeriesMap[date]
    }));

    // Traffic Sources (group ONLY page_views)
    const sourcesAgg = await prisma.analyticsEvent.groupBy({
        by: ['source'],
        _count: { source: true },
        where: { eventType: 'page_view', createdAt: { gte: startDate } }
    });

    const trafficSources = sourcesAgg.map(s => ({
        source: s.source,
        visits: s._count.source
    })).sort((a,b) => b.visits - a.visits);

    return NextResponse.json({
      totalPrompts,
      totalUsers,
      totalSaves,
      totalCopies: promptCopies._sum.copies || 0,
      topPrompts,
      timeSeries,
      trafficSources
    }, {
      headers: { 'Cache-Control': ADMIN_CACHE_HEADER }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

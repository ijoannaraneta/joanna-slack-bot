// API route to DM yourself today's agenda
// GET /api/agenda - fetches today's events and sends them as a Slack DM

import { NextRequest, NextResponse } from 'next/server';
import { getTodaysEvents } from '@/lib/google/calendar';
import { formatAgenda } from '@/lib/logic/agenda';
import { sendSelfDM } from '@/lib/slack/dm';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const events = await getTodaysEvents();
    await sendSelfDM(formatAgenda(events));

    return NextResponse.json({
      success: true,
      action: 'agenda_sent',
      eventCount: events.length,
    });
  } catch (error) {
    console.error('Agenda error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

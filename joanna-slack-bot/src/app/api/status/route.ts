// API route for the dashboard
// GET /api/status - returns the current event, the status the bot maps it to,
// and the rest of today's events. Read-only: does not touch Slack.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEvent, getTodaysEvents, TIMEZONE } from '@/lib/google/calendar';
import { mapEventToStatus } from '@/lib/logic/mapEvent';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [currentEvent, todaysEvents] = await Promise.all([
      getCurrentEvent(),
      getTodaysEvents(),
    ]);

    return NextResponse.json({
      success: true,
      timezone: TIMEZONE,
      currentEvent,
      mappedStatus: currentEvent ? mapEventToStatus(currentEvent) : null,
      todaysEvents,
    });
  } catch (error) {
    console.error('Status error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

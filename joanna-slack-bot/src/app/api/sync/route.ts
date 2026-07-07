// API route to sync calendar event to Slack status
// GET /api/sync - fetches current event and updates Slack

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentEvent } from '@/lib/google/calendar';
import { setStatus, clearStatus } from '@/lib/slack/status';
import { mapEventToStatus } from '@/lib/logic/mapEvent';

export async function GET(request: NextRequest) {
  // When CRON_SECRET is set (i.e. in production), require it as a bearer token.
  // Vercel cron sends this header automatically; other schedulers must include it.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const event = await getCurrentEvent();

    if (event) {
      const status = mapEventToStatus(event);
      await setStatus(status);

      return NextResponse.json({
        success: true,
        action: 'status_updated',
        event: event.summary,
        status,
      });
    } else {
      await clearStatus();

      return NextResponse.json({
        success: true,
        action: 'status_cleared',
        message: 'No current event',
      });
    }
  } catch (error) {
    console.error('Sync error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


import { google, calendar_v3 } from 'googleapis';

export interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
}

function isRelevantEvent(event: calendar_v3.Schema$Event): boolean {
  if (!event.start?.dateTime) return false;

  if (event.transparency === 'transparent') return false;

  const self = event.attendees?.find((a) => a.self);
  if (self?.responseStatus === 'declined') return false;

  return true;
}

function getCalendarClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function getCurrentEvent(): Promise<CalendarEvent | null> {
  const calendar = getCalendarClient();
  const now = new Date();

  
  const response = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + 60000).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const event = (response.data.items ?? []).find(isRelevantEvent);
  if (!event) {
    return null;
  }

  return {
    summary: event.summary || 'Busy',
    start: event.start?.dateTime || '',
    end: event.end?.dateTime || '',
  };
}

export const TIMEZONE = process.env.TIMEZONE || 'Europe/London';

/** Remaining timed events for today (in TIMEZONE), soonest first. */
export async function getTodaysEvents(): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient();
  const now = new Date();

  const response = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    maxResults: 25,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const today = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });

  return (response.data.items ?? [])
    .filter(isRelevantEvent)
    .filter((event) => {
      const startsToday =
        new Date(event.start!.dateTime!).toLocaleDateString('en-CA', {
          timeZone: TIMEZONE,
        }) === today;
      return startsToday;
    })
    .map((event) => ({
      summary: event.summary || 'Busy',
      start: event.start?.dateTime || '',
      end: event.end?.dateTime || '',
    }));
}

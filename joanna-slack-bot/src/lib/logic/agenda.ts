// Formats today's calendar events into a Slack agenda message.

import type { CalendarEvent } from '../google/calendar';
import { TIMEZONE } from '../google/calendar';
import { findRule } from './mapEvent';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  });
}

export function formatAgenda(events: CalendarEvent[]): string {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIMEZONE,
  });

  if (events.length === 0) {
    return `:sunny: *Your agenda for ${today}*\n\nNo events today — enjoy the free time!`;
  }

  const lines = events.map((event) => {
    const emoji = findRule(event.summary)?.emoji ?? ':small_blue_diamond:';
    return `${emoji} *${formatTime(event.start)}–${formatTime(event.end)}*  ${event.summary}`;
  });

  return `:sunny: *Your agenda for ${today}*\n\n${lines.join('\n')}`;
}

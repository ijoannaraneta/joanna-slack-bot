// Event mapping logic
// Maps calendar event summary to Slack status with appropriate emoji,
// and decides whether Do Not Disturb should be on for the event.

import type { CalendarEvent } from '../google/calendar';
import type { SlackStatus } from '../slack/status';

export interface StatusRule {
  /** Case-insensitive substrings matched against the event title */
  keywords: string[];
  emoji: string;
  /** Turn on Slack Do Not Disturb for the duration of the event */
  dnd?: boolean;
}

// First matching rule wins — add or reorder rules to customize.
export const STATUS_RULES: StatusRule[] = [
  { keywords: ['focus', 'deep work'], emoji: ':brain:', dnd: true },
  { keywords: ['interview'], emoji: ':handshake:', dnd: true },
  { keywords: ['1:1', '1-1', 'one on one'], emoji: ':busts_in_silhouette:', dnd: true },
  { keywords: ['lunch'], emoji: ':ramen:' },
  { keywords: ['gym', 'workout'], emoji: ':muscle:' },
  { keywords: ['dentist'], emoji: ':tooth:' },
  { keywords: ['doctor', 'appointment'], emoji: ':stethoscope:' },
  { keywords: ['meeting', 'standup', 'stand-up', 'sync'], emoji: ':calendar:', dnd: true },
];

const DEFAULT_EMOJI = ':computer:';

export function findRule(summary: string): StatusRule | undefined {
  const lower = summary.toLowerCase();
  return STATUS_RULES.find((rule) =>
    rule.keywords.some((keyword) => lower.includes(keyword))
  );
}

export function mapEventToStatus(event: CalendarEvent): SlackStatus {
  const rule = findRule(event.summary);

  return {
    emoji: rule?.emoji ?? DEFAULT_EMOJI,
    text: event.summary,
    expiration: Math.floor(new Date(event.end).getTime() / 1000),
    dnd: rule?.dnd ?? false,
  };
}

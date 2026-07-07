
import { WebClient } from '@slack/web-api';

const client = new WebClient(process.env.SLACK_USER_TOKEN);

export interface SlackStatus {
  emoji: string;
  text: string;
  expiration: number; // Unix timestamp
  dnd: boolean;
}

export async function setStatus(status: SlackStatus): Promise<void> {
  await client.users.profile.set({
    profile: {
      status_text: status.text,
      status_emoji: status.emoji,
      status_expiration: status.expiration,
    },
  });

  if (status.dnd) {
    const minutesLeft = Math.ceil((status.expiration * 1000 - Date.now()) / 60000);
    if (minutesLeft > 0) {
      await client.dnd.setSnooze({ num_minutes: minutesLeft });
    }
  } else {
    await endSnoozeIfActive();
  }
}

export async function clearStatus(): Promise<void> {
  await client.users.profile.set({
    profile: {
      status_text: '',
      status_emoji: '',
      status_expiration: 0,
    },
  });

  await endSnoozeIfActive();
}

async function endSnoozeIfActive(): Promise<void> {
  const info = await client.dnd.info({});
  if ((info as { snooze_enabled?: boolean }).snooze_enabled) {
    await client.dnd.endSnooze();
  }
}

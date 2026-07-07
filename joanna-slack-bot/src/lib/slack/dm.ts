

import { WebClient } from '@slack/web-api';

const client = new WebClient(process.env.SLACK_USER_TOKEN);

export async function sendSelfDM(text: string): Promise<void> {
  const auth = await client.auth.test();
  const conversation = await client.conversations.open({ users: auth.user_id! });
  await client.chat.postMessage({
    channel: conversation.channel!.id!,
    text,
    unfurl_links: false,
  });
}

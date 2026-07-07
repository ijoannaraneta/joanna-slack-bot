# joanna-slack-bot

Syncs your Slack status with your Google Calendar. Every 5 minutes it checks
what's on your calendar right now and sets a matching Slack status + emoji
(for example "Lunch" → :ramen:), clearing it when nothing is scheduled.

## How it works

- `GET /api/sync` — fetches the current calendar event, maps it to a status
  (`src/lib/logic/mapEvent.ts`), and updates Slack. Rules marked `dnd: true`
  (focus blocks, meetings, interviews, 1:1s) also turn on Do Not Disturb for
  the duration of the event. Protected by `CRON_SECRET`.
- `GET /api/agenda` — DMs you today's schedule. Scheduled weekday mornings.
- A scheduler (Vercel cron or GitHub Actions) calls `/api/sync` every 5 minutes
  and `/api/agenda` at 07:00 UTC on weekdays.
- All-day events, declined invites, and events marked "Free" are ignored.

## Setup

### 1. Slack app

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → From scratch.
2. Under **OAuth & Permissions**, add these **User Token Scopes**
   (user scopes, not bot scopes — bots can't set your personal status):
   `users.profile:write`, `dnd:write`, `dnd:read`, `chat:write`, `im:write`.
3. Click **Install to Workspace** and copy the **User OAuth Token** (`xoxp-...`).

### 2. Google Cloud project

1. In [Google Cloud Console](https://console.cloud.google.com), create a project
   and enable the **Google Calendar API**.
2. Configure the OAuth consent screen (External, add yourself as a test user).
3. Create an **OAuth client ID** of type **Web application** with authorized
   redirect URI `http://localhost:3333/oauth2callback`.
4. Copy the client ID and secret.

### 3. Local configuration

```bash
cp .env.example .env.local
# fill in SLACK_USER_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
npm install
npm run get-google-token   # opens a browser; paste the printed token into .env.local
```

Test it end to end:

```bash
npm run dev
curl http://localhost:3000/api/sync
```

With an event happening right now, your Slack status should update.
(Locally, auth is skipped unless CRON_SECRET is set in .env.local.)

### 4. Deploy + schedule

1. Deploy to [Vercel](https://vercel.com/new), setting the project root to this
   directory. Add all the `.env.local` values (including a random `CRON_SECRET`)
   as environment variables.
2. Scheduling:
   - **Vercel Pro**: `vercel.json` already defines a cron every 5 minutes; done.
   - **Vercel Hobby** (crons only run once/day): use the GitHub Actions workflow
     in `.github/workflows/sync.yml` instead. Add two repository secrets on
     GitHub: `SYNC_URL` (your deployment base URL, e.g.
     `https://your-app.vercel.app` — no trailing slash) and
     `CRON_SECRET` (same value as on Vercel).

## Customizing statuses

Edit the keyword → emoji rules in `src/lib/logic/mapEvent.ts`.

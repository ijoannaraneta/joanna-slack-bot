'use client';

import { useCallback, useEffect, useState } from 'react';

interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
}

interface MappedStatus {
  emoji: string;
  text: string;
  expiration: number;
  dnd: boolean;
}

interface StatusData {
  timezone: string;
  currentEvent: CalendarEvent | null;
  mappedStatus: MappedStatus | null;
  todaysEvents: CalendarEvent[];
}

const EMOJI: Record<string, string> = {
  ':brain:': '\u{1F9E0}',
  ':handshake:': '\u{1F91D}',
  ':busts_in_silhouette:': '\u{1F465}',
  ':ramen:': '\u{1F35C}',
  ':muscle:': '\u{1F4AA}',
  ':tooth:': '\u{1F9B7}',
  ':stethoscope:': '\u{1FA7A}',
  ':calendar:': '\u{1F4C5}',
  ':computer:': '\u{1F4BB}',
};

function renderEmoji(code: string): string {
  return EMOJI[code] ?? code;
}

function formatTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });
}

export default function Dashboard() {
  const [secret, setSecret] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cron_secret');
    if (saved) setSecret(saved);
  }, []);

  const fetchStatus = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/status', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.status === 401) {
        setError('Wrong secret — check CRON_SECRET in .env.local');
        setData(null);
        return;
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (secret) fetchStatus(secret);
  }, [secret, fetchStatus]);

  async function runAction(path: string, label: string) {
    setActionMessage(`${label}...`);
    try {
      const res = await fetch(path, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const json = await res.json();
      setActionMessage(json.success ? `${label} done (${json.action})` : `Failed: ${json.error}`);
      fetchStatus(secret);
    } catch (err) {
      setActionMessage(`Failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  if (!secret) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <form
          className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8"
          onSubmit={(e) => {
            e.preventDefault();
            localStorage.setItem('cron_secret', secretInput);
            setSecret(secretInput);
          }}
        >
          <h1 className="text-lg font-semibold text-zinc-50">Joanna&apos;s Slack Bot</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Enter your <code className="text-zinc-300">CRON_SECRET</code> to open the dashboard.
          </p>
          <input
            type="password"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            placeholder="CRON_SECRET"
            className="mt-4 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-zinc-100 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <main className="mx-auto w-full max-w-2xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">Joanna&apos;s Slack Bot</h1>
            <p className="text-sm text-zinc-500">Google Calendar → Slack status</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('cron_secret');
              setSecret('');
              setSecretInput('');
              setData(null);
            }}
            className="text-xs text-zinc-500 transition hover:text-zinc-300"
          >
            Lock
          </button>
        </header>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Right now
          </h2>
          {loading && !data ? (
            <p className="mt-3 text-sm text-zinc-400">Loading…</p>
          ) : data?.currentEvent && data.mappedStatus ? (
            <div className="mt-3 flex items-center gap-4">
              <span className="text-4xl">{renderEmoji(data.mappedStatus.emoji)}</span>
              <div>
                <p className="text-lg font-medium text-zinc-100">{data.currentEvent.summary}</p>
                <p className="text-sm text-zinc-400">
                  until {formatTime(data.currentEvent.end, data.timezone)}
                  {data.mappedStatus.dnd && (
                    <span className="ml-2 rounded-full bg-purple-950 px-2 py-0.5 text-xs text-purple-300">
                      Do Not Disturb
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">
              No event right now — status is clear.
            </p>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Rest of today
          </h2>
          {data && data.todaysEvents.length > 0 ? (
            <ul className="mt-3 divide-y divide-zinc-800">
              {data.todaysEvents.map((event) => (
                <li key={`${event.start}-${event.summary}`} className="flex items-center gap-3 py-2.5">
                  <span className="w-24 shrink-0 font-mono text-xs text-zinc-500">
                    {formatTime(event.start, data.timezone)}–{formatTime(event.end, data.timezone)}
                  </span>
                  <span className="text-sm text-zinc-200">{event.summary}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">Nothing else scheduled today.</p>
          )}
        </section>

        <section className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => runAction('/api/sync', 'Sync')}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white"
          >
            Sync now
          </button>
          <button
            onClick={() => runAction('/api/agenda', 'Agenda DM')}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
          >
            Send agenda DM
          </button>
          <button
            onClick={() => fetchStatus(secret)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
          >
            Refresh
          </button>
          {actionMessage && <span className="text-sm text-zinc-400">{actionMessage}</span>}
        </section>
      </main>
    </div>
  );
}

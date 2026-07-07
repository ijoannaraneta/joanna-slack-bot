// One-time script to obtain a Google OAuth refresh token.
//
// Prerequisites:
//   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set in .env.local
//   - The OAuth client in Google Cloud must be of type "Web application"
//     with http://localhost:3333/oauth2callback as an authorized redirect URI
//
// Run with: npm run get-google-token
// Then paste the printed refresh token into .env.local as GOOGLE_REFRESH_TOKEN.

import http from 'node:http';
import { exec } from 'node:child_process';
import { google } from 'googleapis';

const PORT = 3333;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // force a refresh token even if previously authorized
  scope: ['https://www.googleapis.com/auth/calendar.readonly'],
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400).end('Missing ?code param');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h2>Done! You can close this tab and return to the terminal.</h2>');

    console.log('\nSuccess! Add this line to .env.local:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  } catch (err) {
    res.writeHead(500).end('Token exchange failed, check the terminal.');
    console.error('Token exchange failed:', err.message);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log('Opening browser for Google sign-in...');
  console.log(`If it does not open automatically, visit:\n\n${authUrl}\n`);
  exec(`open "${authUrl}"`);
});

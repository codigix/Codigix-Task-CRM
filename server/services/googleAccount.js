/**
 * The per-user Google connection ("Connect my Google account" on the Meetings page), shared by every feature
 * that acts as the user: Calendar/Meet (meetings-routes) and Gmail sending (userMail).
 * Refresh tokens live encrypted in google_oauth; `scopes` records what the user actually granted.
 */
const crypto = require('crypto');
const { google } = require('googleapis');

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/meetings.space.created',
  GMAIL_SEND_SCOPE,
  'openid',
  'email'
];

const vaultKey = () => crypto.createHash('sha256').update(process.env.VAULT_KEY || `${process.env.JWT_SECRET || 'codigix'}:meetings-google`).digest();
const seal = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', vaultKey(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ct.toString('base64')}`;
};
const unseal = (stored) => {
  const [v, iv, tag, ct] = String(stored || '').split(':');
  if (v !== 'v1') throw new Error('Unknown secret format');
  const d = crypto.createDecipheriv('aes-256-gcm', vaultKey(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
};

// New connections always use the current client. A refresh token only works with the client that issued it,
// so connections made before the client was replaced (client_id NULL, or the legacy id) keep using the legacy
// client (GOOGLE_OAUTH_LEGACY_CLIENT_ID / _SECRET) until those people reconnect.
const oauthCfg = () => ({ id: process.env.GOOGLE_OAUTH_CLIENT_ID || '', secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '' });
const legacyCfg = () => ({ id: process.env.GOOGLE_OAUTH_LEGACY_CLIENT_ID || '', secret: process.env.GOOGLE_OAUTH_LEGACY_CLIENT_SECRET || '' });
const oauthConfigured = () => { const c = oauthCfg(); return !!(c.id && c.secret); };
const currentClientId = () => oauthCfg().id;
const makeOAuth = (redirect) => new google.auth.OAuth2(oauthCfg().id, oauthCfg().secret, redirect);

const cfgForRow = (row) => {
  const legacy = legacyCfg();
  const useLegacy = legacy.id && legacy.secret && (!row.client_id || row.client_id === legacy.id);
  return useLegacy ? legacy : oauthCfg();
};

/** An OAuth client signed in as this user (with the client that issued their token), or null when not connected. */
const clientFor = (row) => {
  if (!row) return null;
  const cfg = cfgForRow(row);
  if (!cfg.id || !cfg.secret) return null;
  const auth = new google.auth.OAuth2(cfg.id, cfg.secret);
  auth.setCredentials({ refresh_token: unseal(row.refresh_token) });
  return auth;
};

/** Any Google connection can be used: the current client, or the legacy one for older connections. */
const anyClientConfigured = () => oauthConfigured() || !!(legacyCfg().id && legacyCfg().secret);

const hasScope = (row, scope) => String(row?.scopes || '').split(/\s+/).includes(scope);

/** Google says the token is dead (revoked, password changed, account removed): the row is useless. */
const isDeadToken = (e) => /invalid_grant/i.test(`${e?.message} ${e?.response?.data?.error}`);

module.exports = { GMAIL_SEND_SCOPE, OAUTH_SCOPES, seal, unseal, oauthConfigured, anyClientConfigured, currentClientId, makeOAuth, clientFor, hasScope, isDeadToken };

/**
 * Sends an email as the person who triggered it.
 *
 *   1. They connected Google with the Gmail permission → sent through the Gmail API from their own address
 *      (it shows in their Sent folder, and replies come back to them).
 *   2. Otherwise → the shared SMTP account in server/.env (EMAIL_HOST / EMAIL_USER / EMAIL_PASS), as before.
 *
 * Callers pass ordinary nodemailer options. `from` is only used for the shared account; on Gmail the sender is
 * always the user, so replyTo is dropped too (replies already reach them).
 */
const nodemailer = require('nodemailer');
const MailComposer = require('nodemailer/lib/mail-composer');
const { google } = require('googleapis');
const googleAccount = require('./googleAccount');

const smtpConfig = () => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || '').trim();
  if (!user || !pass) return null;
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  return { host, port, secure: port === 465, auth: { user, pass }, from: process.env.EMAIL_FROM || user };
};

/** The sender's Gmail connection, or null. Never throws: a missing table/column just means "not connected". */
const gmailAccount = async (pool, userId) => {
  if (!userId || !googleAccount.anyClientConfigured()) return null;
  try {
    const [[row]] = await pool.query(
      `SELECT g.*, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS user_name
         FROM google_oauth g LEFT JOIN users u ON u.id = g.user_id WHERE g.user_id = ?`, [userId]);
    return row && row.email && googleAccount.hasScope(row, googleAccount.GMAIL_SEND_SCOPE) ? row : null;
  } catch { return null; }
};

const recipients = (mail) => [mail.to, mail.cc, mail.bcc].flat().filter(Boolean).join(',').split(',').map((s) => s.trim()).filter(Boolean);

const viaGmail = async (account, mail) => {
  const { replyTo, from, ...rest } = mail;
  const raw = await new MailComposer({ ...rest, from: { name: account.user_name || account.email, address: account.email } }).compile().build();
  const gmail = google.gmail({ version: 'v1', auth: googleAccount.clientFor(account) });
  const resp = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: raw.toString('base64url') } });
  return { messageId: resp.data.id, accepted: recipients(mail), rejected: [], response: `Gmail API: sent as ${account.email}` };
};

/** True when an email from this user can go out by either route (use it before doing expensive work like PDFs). */
const canSendMail = async (pool, userId) => !!(smtpConfig() || await gmailAccount(pool, userId));

/**
 * Send `mail` as `userId`. Resolves to { via: 'gmail' | 'smtp', from, info } with a nodemailer-shaped info.
 * Throws (with nodemailer-style codes, so mailError() still explains it) when nothing could send it.
 */
const sendMailAs = async (pool, userId, mail) => {
  const account = await gmailAccount(pool, userId);
  const smtp = smtpConfig();
  if (account) {
    try { return { via: 'gmail', from: account.email, info: await viaGmail(account, mail) }; }
    catch (e) {
      if (googleAccount.isDeadToken(e)) await pool.query('DELETE FROM google_oauth WHERE user_id = ?', [account.user_id]).catch(() => { });
      console.warn(`[mail] Gmail send as ${account.email} failed${smtp ? ', using the shared account instead' : ''}:`, e?.errors?.[0]?.message || e.message);
      if (!smtp) throw e;
    }
  }
  if (!smtp) {
    const e = new Error('Email is not set up: connect your Google account on the Meetings page, or set EMAIL_USER / EMAIL_PASS in server/.env.');
    e.code = 'ENOSETUP';
    throw e;
  }
  const { from, ...transport } = smtp;
  const info = await nodemailer.createTransport(transport).sendMail({ ...mail, from: mail.from || from });
  return { via: 'smtp', from: transport.auth.user, info };
};

module.exports = { sendMailAs, canSendMail };

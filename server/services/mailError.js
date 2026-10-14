/**
 * Turns a nodemailer failure into a message a salesperson can act on. Sending is never the only
 * way out: the PDF can be downloaded and shared by hand, then recorded with "Mark as sent".
 */
const FALLBACK = 'Download the PDF and send it yourself, then use "Mark as sent".';

module.exports = function mailError(e) {
  const code = String(e?.code || '');
  const text = String(e?.response || e?.message || '');
  // Gmail and most providers refuse an account password over SMTP; they need an app password.
  if (code === 'EAUTH' || /\b535\b|Invalid login|BadCredentials|Username and Password not accepted/i.test(text)) {
    return { status: 503, error: `The email account on the server rejected the login (EMAIL_USER / EMAIL_PASS in server/.env). For Gmail, EMAIL_PASS must be an App Password, not the account password. ${FALLBACK}` };
  }
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'EDNS'].includes(code)) {
    return { status: 503, error: `The server could not reach the mail server (${process.env.EMAIL_HOST || process.env.SMTP_HOST || 'not set'}). ${FALLBACK}` };
  }
  if (code === 'EENVELOPE' || /\b55[0-4]\b/.test(text)) {
    return { status: 400, error: `The mail server refused the address: ${text.split('\n')[0]}. Check the email and try again.` };
  }
  return { status: 502, error: `Could not send the email: ${text.split('\n')[0] || 'unknown error'}. ${FALLBACK}` };
};

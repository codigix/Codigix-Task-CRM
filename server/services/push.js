const webpush = require('web-push');

/**
 * Web Push: notifications in the phone / desktop notification bar, delivered even when the
 * CRM is in the background or closed. This is the only way to notify on iPhone/iPad
 * (iOS 16.4+, with the CRM added to the Home Screen) and the reliable way on Android.
 *
 * Each browser/device that turns notifications on stores a subscription here. Signing keys
 * (VAPID) come from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in .env, or are generated once and
 * kept in the database so existing subscriptions keep working across restarts.
 */

let pool = null;
let ready = null;
let keys = null;

const init = (p) => {
  if (ready) return ready;
  pool = p;
  ready = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      endpoint VARCHAR(700) NOT NULL,
      p256dh VARCHAR(255) NOT NULL,
      auth VARCHAR(100) NOT NULL,
      user_agent VARCHAR(255) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME NULL,
      UNIQUE KEY uniq_push_endpoint (endpoint(255)),
      KEY idx_push_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await pool.query(`CREATE TABLE IF NOT EXISTS push_vapid_keys (
      id INT PRIMARY KEY,
      public_key VARCHAR(200) NOT NULL,
      private_key VARCHAR(200) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    } else {
      const [[row]] = await pool.query('SELECT public_key, private_key FROM push_vapid_keys WHERE id = 1');
      if (row) keys = { publicKey: row.public_key, privateKey: row.private_key };
      else {
        keys = webpush.generateVAPIDKeys();
        await pool.query('INSERT IGNORE INTO push_vapid_keys (id, public_key, private_key) VALUES (1, ?, ?)', [keys.publicKey, keys.privateKey]);
        const [[stored]] = await pool.query('SELECT public_key, private_key FROM push_vapid_keys WHERE id = 1');
        keys = { publicKey: stored.public_key, privateKey: stored.private_key };
      }
    }
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@codigixinfotech.com', keys.publicKey, keys.privateKey);
  })().catch(e => { console.error('Push setup failed:', e.message); keys = null; });
  return ready;
};

const publicKey = async () => { await ready; return keys?.publicKey || null; };

const subscribe = async (userId, sub, userAgent) => {
  await ready;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) throw new Error('Invalid subscription');
  await pool.query(`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth), user_agent = VALUES(user_agent)`,
  [userId, String(sub.endpoint).slice(0, 700), String(sub.keys.p256dh).slice(0, 255), String(sub.keys.auth).slice(0, 100), String(userAgent || '').slice(0, 255)]);
};

const unsubscribe = async (userId, endpoint) => {
  await ready;
  await pool.query('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', [userId, endpoint]);
};

/**
 * Send one notification to every device of these people. payload: { title, body, url, tag,
 * icon, roomId, kind }. Never throws; dead subscriptions (410/404) are removed.
 */
const sendToUsers = async (userIds, payload) => {
  try {
    await ready;
    if (!keys || !userIds?.length) return 0;
    const ids = [...new Set(userIds.map(Number).filter(Boolean))];
    if (!ids.length) return 0;
    const [subs] = await pool.query('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id IN (?)', [ids]);
    const body = JSON.stringify(payload);
    let sent = 0;
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 12, urgency: 'high', topic: payload.tag ? String(payload.tag).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) : undefined });
        sent += 1;
        pool.query('UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = ?', [s.id]).catch(() => {});
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) pool.query('DELETE FROM push_subscriptions WHERE id = ?', [s.id]).catch(() => {});
        else console.error('Push send failed:', e.statusCode || '', e.body || e.message);
      }
    }));
    return sent;
  } catch (e) {
    console.error('Push error:', e.message);
    return 0;
  }
};

module.exports = { init, publicKey, subscribe, unsubscribe, sendToUsers };

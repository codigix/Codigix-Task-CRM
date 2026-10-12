const push = require('../services/push');

/** Turning phone / desktop notifications on and off for the signed-in person's device. */
module.exports = function setupPushRoutes(app, pool) {
  push.init(pool);

  app.get('/api/push/public-key', async (req, res) => {
    const key = await push.publicKey();
    if (!key) return res.status(503).json({ error: 'Notifications are not available on the server.' });
    res.json({ publicKey: key });
  });

  app.post('/api/push/subscribe', async (req, res) => {
    try {
      if (!req.user?.id) return res.status(401).json({ error: 'Please sign in again.' });
      await push.subscribe(req.user.id, req.body?.subscription, req.headers['user-agent']);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message || 'Could not turn on notifications' });
    }
  });

  app.post('/api/push/unsubscribe', async (req, res) => {
    try {
      if (!req.user?.id) return res.status(401).json({ error: 'Please sign in again.' });
      await push.unsubscribe(req.user.id, String(req.body?.endpoint || ''));
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Could not turn off notifications' }); }
  });

  // "Send me a test" from the notification settings card.
  app.post('/api/push/test', async (req, res) => {
    if (!req.user?.id) return res.status(401).json({ error: 'Please sign in again.' });
    const sent = await push.sendToUsers([req.user.id], { title: 'Notifications are on', body: 'You will see new chat messages here.', tag: 'push-test', url: '/', kind: 'test' });
    res.json({ sent });
  });
};

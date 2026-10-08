const express = require('express');
const router = express.Router();
const { buildTeamReport, buildEmployeeReport } = require('../services/performanceReport');

// HR, managers and admins see everyone; anyone else only their own report.
const canSeeTeam = (user) => {
  const role = String(user?.role || '').toLowerCase();
  return Boolean(user) && (user.isManager || user.isAdmin || /\bhr\b|human resource/.test(role));
};

module.exports = (pool) => {
  // ── Performance report (computed from recorded work only) ──────────────────
  // GET /api/hr/performance/report?period=month|quarter|year|custom&value=2026-10&from=&to=&department=
  router.get('/report', async (req, res) => {
    if (!canSeeTeam(req.user)) {
      return res.status(403).json({ error: 'Only HR, managers and admins can view the team report.' });
    }
    try {
      res.json(await buildTeamReport(pool, req.query));
    } catch (err) {
      if (err.message === 'Invalid date range') return res.status(400).json({ error: err.message });
      console.error('Performance report error:', err);
      res.status(500).json({ error: 'Failed to build the performance report' });
    }
  });

  router.get('/report/employee/:id', async (req, res) => {
    const isSelf = String(req.user?.id) === String(req.params.id);
    if (!isSelf && !canSeeTeam(req.user)) {
      return res.status(403).json({ error: 'You can only view your own performance report.' });
    }
    try {
      const report = await buildEmployeeReport(pool, req.params.id, req.query);
      if (!report) return res.status(404).json({ error: 'Employee not found' });
      res.json(report);
    } catch (err) {
      if (err.message === 'Invalid date range') return res.status(400).json({ error: err.message });
      console.error('Employee performance report error:', err);
      res.status(500).json({ error: 'Failed to build the employee report' });
    }
  });

  // ── Standard size per kind of work (hours) ─────────────────────────────────
  // A finished task is worth its own planned time, else the standard size for its work
  // type. These sizes are what stop "many small tickets" from looking like "lots of work".
  pool.query(`
    CREATE TABLE IF NOT EXISTS work_type_sizes (
      work_type VARCHAR(100) PRIMARY KEY,
      hours DECIMAL(6,2) NOT NULL,
      updated_by VARCHAR(120) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch(e => console.error('Error creating work_type_sizes:', e.message));

  // A measured value is only offered as a standard once it's based on this many finished tasks.
  const MIN_MEASURED_TASKS = 5;

  router.get('/work-sizes', async (req, res) => {
    try {
      const { DEFAULT_WORK_SIZES } = require('../services/performanceReport');
      const [rows] = await pool.query('SELECT work_type, hours, updated_by, updated_at FROM work_type_sizes');
      const saved = new Map(rows.map(r => [r.work_type.toLowerCase(), r]));
      // Every work type in use, plus the defaults, with the size that applies to it.
      const [used] = await pool.query('SELECT issue_key, labels, type, status, updated_at FROM it_kanban_issues');
      const types = new Set(Object.keys(DEFAULT_WORK_SIZES));
      const NON_WORK = new Set(['content-calendar', 'it', 'marketing', 'ai-added', 'not-in-performance']);
      const typeOfKey = new Map();
      const doneKeys = new Set();
      used.forEach(i => {
        let l = i.labels; if (typeof l === 'string') { try { l = JSON.parse(l); } catch (e) { l = []; } }
        const label = (Array.isArray(l) ? l : []).map(x => String(x || '').trim()).find(x => x && !NON_WORK.has(x.toLowerCase()));
        const wt = label || i.type || 'Task';
        types.add(wt);
        typeOfKey.set(i.issue_key, wt);
        if (['DONE', 'COMPLETED', 'CLOSED'].includes(String(i.status || '').toUpperCase())) doneKeys.add(i.issue_key);
      });

      // Measured time per kind of work: total recorded (approved) time on each finished
      // ticket of the last 90 days, then per work type the median (robust to a forgotten
      // timer or a half-tracked task), the average and how many tasks it is based on.
      let logRows = [];
      try {
        [logRows] = await pool.query(
          `SELECT issue_key, SUM(seconds) AS seconds, MAX(COALESCE(started_at, created_at)) AS last_at
             FROM it_kanban_worklogs
            WHERE COALESCE(approval, 'approved') = 'approved'
              AND COALESCE(started_at, created_at) >= NOW() - INTERVAL 90 DAY
            GROUP BY issue_key`
        );
      } catch (e) {
        [logRows] = await pool.query(
          `SELECT issue_key, SUM(seconds) AS seconds FROM it_kanban_worklogs
            WHERE COALESCE(started_at, created_at) >= NOW() - INTERVAL 90 DAY GROUP BY issue_key`
        );
      }
      const samples = new Map();
      logRows.forEach(r => {
        if (!doneKeys.has(r.issue_key) || !(Number(r.seconds) > 0)) return;
        const wt = typeOfKey.get(r.issue_key);
        if (!wt) return;
        if (!samples.has(wt.toLowerCase())) samples.set(wt.toLowerCase(), []);
        samples.get(wt.toLowerCase()).push(Number(r.seconds) / 3600);
      });
      const round2 = (n) => Math.round(n * 100) / 100;
      const measuredFor = (wt) => {
        const xs = (samples.get(String(wt).toLowerCase()) || []).slice().sort((a, b) => a - b);
        if (!xs.length) return null;
        const mid = Math.floor(xs.length / 2);
        const median = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
        return {
          tasks: xs.length,
          median: round2(median),
          average: round2(xs.reduce((a, b) => a + b, 0) / xs.length),
          min: round2(xs[0]),
          max: round2(xs[xs.length - 1]),
          // Rounded to the nearest quarter hour, the value offered as the new standard.
          suggested: Math.max(0.25, Math.round(median * 4) / 4),
          enough: xs.length >= MIN_MEASURED_TASKS
        };
      };
      const list = [...types].map(t => {
        const s = saved.get(t.toLowerCase());
        const def = Object.entries(DEFAULT_WORK_SIZES).find(([k]) => k.toLowerCase() === t.toLowerCase());
        return { workType: t, hours: s ? Number(s.hours) : (def ? def[1] : 1), isDefault: !s, updatedBy: s?.updated_by || null, measured: measuredFor(t) };
      }).sort((a, b) => a.workType.localeCompare(b.workType));
      res.json({ sizes: list, canEdit: canSeeTeam(req.user), minMeasuredTasks: MIN_MEASURED_TASKS, windowDays: 90 });
    } catch (err) {
      console.error('Work sizes error:', err);
      res.status(500).json({ error: 'Failed to load work sizes' });
    }
  });

  router.put('/work-sizes', async (req, res) => {
    if (!canSeeTeam(req.user)) return res.status(403).json({ error: 'Only HR, managers and admins can change work sizes.' });
    const sizes = Array.isArray(req.body?.sizes) ? req.body.sizes : [];
    const bad = sizes.find(s => !String(s.workType || '').trim() || !(Number(s.hours) > 0) || Number(s.hours) > 200);
    if (!sizes.length || bad) return res.status(400).json({ error: 'Each work type needs a size between 0 and 200 hours.' });
    try {
      for (const s of sizes) {
        await pool.query(
          'INSERT INTO work_type_sizes (work_type, hours, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE hours = VALUES(hours), updated_by = VALUES(updated_by)',
          [String(s.workType).trim().slice(0, 100), Number(s.hours), req.user?.name || null]
        );
      }
      res.json({ success: true, saved: sizes.length });
    } catch (err) {
      console.error('Work sizes save error:', err);
      res.status(500).json({ error: 'Failed to save work sizes' });
    }
  });

  // The old /overview, /employees and /employees/:id endpoints were removed: they filled
  // gaps with invented values (a fixed manager name, hours guessed from points). All
  // performance figures now come from services/performanceReport.js via /report.

  // 4. Submit a new review
  router.post('/employees/:id/review', async (req, res) => {
    if (!canSeeTeam(req.user)) {
      return res.status(403).json({ error: 'Only HR, managers and admins can submit reviews.' });
    }
    if (String(req.user.id) === String(req.params.id)) {
      return res.status(400).json({ error: 'You cannot review yourself.' });
    }
    try {
      const empId = req.params.id;
      const { taskCompletion, quality, onTime, efficiency, feedback } = req.body || {};
      // Older clients also sent these two; they are optional now.
      const reviewGatePoints = req.body?.reviewGatePoints ?? null;
      const pointsDistribution = req.body?.pointsDistribution ?? null;

      const ratings = [taskCompletion, quality, onTime, efficiency].map(Number);
      if (ratings.some(n => !Number.isFinite(n) || n < 0 || n > 100)) {
        return res.status(400).json({ error: 'Each rating must be a number from 0 to 100.' });
      }
      const overallScore = Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);

      await pool.query(`
        INSERT INTO performance_reviews 
        (employee_id, reviewer_id, score, task_completion, quality_of_work, on_time_delivery, efficiency, review_gate_points, points_distribution, feedback)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        empId,
        req.user.id,
        overallScore,
        ratings[0],
        ratings[1],
        ratings[2],
        ratings[3],
        // Both columns are NOT NULL; the current review form doesn't send them.
        Number(reviewGatePoints) || 0,
        Number(pointsDistribution) || 0,
        String(feedback || '').slice(0, 5000)
      ]);

      return res.status(200).json({ success: true, message: 'Review submitted successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to submit review' });
    }
  });


  return router;
};

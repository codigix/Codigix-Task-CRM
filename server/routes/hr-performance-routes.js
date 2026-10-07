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

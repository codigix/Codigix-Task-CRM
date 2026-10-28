const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const OPEN_BUG = ['Open', 'In Progress'];
const DONE_TASK = ['DONE', 'COMPLETED', 'CLOSED'];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// GET /api/tester/dashboard/:username
// Everything here is real: test cases / runs / bugs / automation from their tables, and the
// signed-in tester's own board work. "Me" is the session user, never the name in the URL.
// Optional ?start=YYYY-MM-DD&end=YYYY-MM-DD limits test runs and bugs to that period.
router.get('/dashboard/:username', async (req, res) => {
  try {
    const meName = String(req.user?.name || '').trim();
    const meUsername = String(req.user?.username || '').trim();
    const mine = (v) => {
      const s = String(v ?? '').trim().toLowerCase();
      return Boolean(s) && (s === meName.toLowerCase() || s === meUsername.toLowerCase() || s === String(req.user?.id ?? ''));
    };
    const start = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.start || '')) ? req.query.start : null;
    const end = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.end || '')) ? req.query.end : null;
    const inRange = (d) => { if (!d) return !start && !end; const day = ymd(new Date(d)); return (!start || day >= start) && (!end || day <= end); };

    const [testCases] = await pool.query('SELECT * FROM test_cases');
    const [allRuns] = await pool.query(`
      SELECT tr.*, tc.title, tc.module
      FROM test_runs tr
      JOIN test_cases tc ON tr.test_case_id = tc.id
      ORDER BY tr.executed_on DESC
    `);
    const [automationScripts] = await pool.query('SELECT * FROM automation_scripts');
    const [allBugs] = await pool.query('SELECT * FROM bugs ORDER BY created_at DESC');
    const testRuns = allRuns.filter(r => inRange(r.executed_on));
    const bugs = allBugs.filter(b => inRange(b.created_at));

    // The tester's own work on the task board (the board's tasks, and Bug-type tickets), plus the
    // tickets in Testing they were picked to test. Those show as the tester's board shows them:
    // To Do while waiting (or paused), In Progress while their testing clock runs.
    const [boardOpen] = meName ? await pool.query(
      `SELECT i.issue_key, i.title,
              CASE WHEN UPPER(COALESCE(i.status, '')) LIKE '%TESTING%' AND TRIM(COALESCE(i.tester, '')) = ?
                   THEN IF(i.test_timer_start IS NULL, 'To Do', 'In Progress') ELSE i.status END AS status,
              i.priority, i.type, DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date, p.name AS project
         FROM it_kanban_issues i LEFT JOIN projects p ON p.id = i.project_id
        WHERE UPPER(COALESCE(i.status, '')) NOT IN (?)
          AND (TRIM(i.assignee) = ?
               OR (TRIM(COALESCE(i.tester, '')) = ? AND UPPER(COALESCE(i.status, '')) LIKE '%TESTING%'
                   AND COALESCE(i.testing_state, '') NOT IN ('PASSED', 'FAILED')))
        ORDER BY i.due_date IS NULL, i.due_date, i.id DESC LIMIT 50`,
      [meName, DONE_TASK, meName, meName]
    ) : [[]];
    const [boardBugs] = await pool.query(
      `SELECT i.issue_key, i.title, i.status, i.priority, i.assignee, DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date, p.name AS project
         FROM it_kanban_issues i LEFT JOIN projects p ON p.id = i.project_id
        WHERE i.type = 'Bug' AND UPPER(COALESCE(i.status, '')) NOT IN (?) ORDER BY i.id DESC`,
      [DONE_TASK]
    );

    const executedTests = testRuns.filter(r => r.status !== 'Pending').length;
    const passedTests = testRuns.filter(r => r.status === 'Passed').length;
    const failedTests = testRuns.filter(r => r.status === 'Failed').length;
    const blockedTests = testRuns.filter(r => r.status === 'Blocked').length;

    const totalScripts = automationScripts.length;
    const automatedTests = testCases.filter(c => c.is_automated).length;
    const passedScripts = automationScripts.filter(s => s.status === 'Passed').length;
    const failedScripts = automationScripts.filter(s => s.status === 'Failed' || s.status === 'Broken').length;
    const coverage = testCases.length ? Math.round((automatedTests / testCases.length) * 100) : 0;

    // Test runs per month for the last 6 months (real counts; months without runs are 0).
    const now = new Date();
    const trendData = Array.from({ length: 6 }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + k, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const runs = allRuns.filter(r => r.executed_on && ymd(new Date(r.executed_on)).startsWith(key));
      return {
        name: d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        total: runs.length,
        passed: runs.filter(r => r.status === 'Passed').length,
        failed: runs.filter(r => r.status === 'Failed').length
      };
    });

    const myBugs = [
      ...allBugs.filter(b => OPEN_BUG.includes(b.status) && mine(b.assignee))
        .map(b => ({ id: `BUG-${b.id}`, title: b.title, priority: b.priority, status: b.status, source: 'bugs' })),
      ...boardBugs.filter(b => mine(b.assignee))
        .map(b => ({ id: b.issue_key, title: b.title, priority: b.priority, status: b.status, source: 'board' }))
    ];

    res.json({
      success: true,
      data: {
        me: { name: meName, firstName: meName.split(' ')[0] || meUsername },
        kpis: {
          totalTestCases: testCases.length,
          executedTests,
          passedTests,
          failedTests,
          blockedTests,
          // Open bugs: Bug Tracking entries still open plus open Bug tickets on the board.
          openBugsCount: allBugs.filter(b => OPEN_BUG.includes(b.status)).length + boardBugs.length,
          myOpenTasks: boardOpen.length
        },
        automationSummary: { totalScripts, automatedTests, passedScripts, failedScripts, successRate: totalScripts ? Math.round((passedScripts / totalScripts) * 100) : 0 },
        testCaseCoverage: { coveredPercent: coverage, coveredCount: automatedTests, notCoveredPercent: 100 - coverage, notCoveredCount: testCases.length - automatedTests },
        testsByPriority: {
          high: testCases.filter(c => c.priority === 'High').length,
          medium: testCases.filter(c => c.priority === 'Medium').length,
          low: testCases.filter(c => c.priority === 'Low').length
        },
        bugStatusOverview: {
          open: bugs.filter(b => b.status === 'Open').length,
          inProgress: bugs.filter(b => b.status === 'In Progress').length,
          resolved: bugs.filter(b => b.status === 'Resolved').length,
          closed: bugs.filter(b => b.status === 'Closed').length,
          boardBugs: boardBugs.length
        },
        // Every open bug, from Bug Tracking and the board's Bug tickets, so the "Open Bugs" figure can be seen.
        openBugs: [
          ...allBugs.filter(b => OPEN_BUG.includes(b.status))
            .map(b => ({ id: `BUG-${b.id}`, title: b.title, priority: b.priority, status: b.status, assignee: b.assignee || '', source: 'bugs', mine: mine(b.assignee) })),
          ...boardBugs.map(b => ({ id: b.issue_key, title: b.title, priority: b.priority, status: b.status, assignee: b.assignee || '', project: b.project || '', source: 'board', mine: mine(b.assignee) }))
        ].sort((a, b) => Number(b.mine) - Number(a.mine)).slice(0, 30),
        hasTestingData: testCases.length + allRuns.length + allBugs.length + automationScripts.length > 0,
        recentTestRuns: testRuns.slice(0, 10).map(r => ({ id: r.id, title: r.title, module: r.module, environment: r.environment, status: r.status, executedOn: r.executed_on })),
        assignedTasks: boardOpen,
        assignedBugs: myBugs,
        trendData
      }
    });
  } catch (error) {
    console.error('Error in tester dashboard:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});



// GET /api/tester/test-cases
router.get('/test-cases', async (req, res) => {
  try {
    const [testCases] = await pool.query('SELECT * FROM test_cases ORDER BY created_at DESC');
    res.json({ success: true, data: testCases });
  } catch (error) {
    console.error('Error fetching test cases:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// POST /api/tester/test-cases
router.post('/test-cases', async (req, res) => {
  try {
    const { projectId, title, module, priority, type, isAutomated, status, category, suite, tags, assignedTo, reviewer, milestone, steps, dataSets } = req.body;
    
    // We default to project_id = 1 if not provided for now
    const pId = projectId || 1;
    
    const [result] = await pool.query(
      `INSERT INTO test_cases (project_id, title, module, priority, type, is_automated, status, category, suite, tags, assignedTo, reviewer, milestone, steps, data_sets) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pId, 
        title, 
        module || null, 
        priority || 'Medium', 
        type || 'Functional', 
        isAutomated ? 1 : 0, 
        status || 'Active', 
        category || null,
        suite || null,
        tags ? JSON.stringify(tags) : JSON.stringify([]),
        assignedTo || null,
        reviewer || null,
        milestone || null,
        JSON.stringify(steps || []), 
        JSON.stringify(dataSets || [])
      ]
    );

    const [newTestCase] = await pool.query('SELECT * FROM test_cases WHERE id = ?', [result.insertId]);

    res.json({ success: true, data: newTestCase[0] });
  } catch (error) {
    console.error('Error creating test case:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;

// GET /api/tester/bugs
router.get('/bugs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bugs ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching bugs:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// POST /api/tester/bugs
router.post('/bugs', async (req, res) => {
  try {
    const { projectId, title, module, status, priority, severity, assignee, reporter, environment, bug_type, description, expected_results, actual_results, steps, attachments } = req.body;
    const pId = projectId || 1;
    
    const [result] = await pool.query(
      `INSERT INTO bugs (project_id, title, module, status, priority, severity, assignee, reporter, environment, bug_type, description, expected_results, actual_results, steps, attachments) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [pId, title, module || null, status || 'Open', priority || 'Medium', severity || 'Minor', assignee || null, reporter || null, environment || 'QA', bug_type || 'Functional', description || null, expected_results || null, actual_results || null, JSON.stringify(steps || []), JSON.stringify(attachments || [])]
    );

    const [newBug] = await pool.query('SELECT * FROM bugs WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newBug[0] });
  } catch (error) {
    console.error('Error creating bug:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;

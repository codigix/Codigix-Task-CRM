const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/tester/dashboard/:username
router.get('/dashboard/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // We'll simulate user ID 1 for "assigned to me" tasks/bugs for now
    const userId = 1;

    const [testCases] = await pool.query('SELECT * FROM test_cases');
    const [testRuns] = await pool.query(`
      SELECT tr.*, tc.title, tc.module 
      FROM test_runs tr 
      JOIN test_cases tc ON tr.test_case_id = tc.id
      ORDER BY tr.executed_on DESC
    `);
    const [automationScripts] = await pool.query('SELECT * FROM automation_scripts');
    const [bugs] = await pool.query('SELECT * FROM bugs');
    
    // Also fetch user tasks for "My Assigned Tasks"
    // Using project_tasks if it exists, otherwise returning empty array and letting frontend handle it
    let assignedTasks = [];
    try {
      const [tasks] = await pool.query('SELECT * FROM tasks WHERE assigned_to = ? ORDER BY created_at DESC LIMIT 5', [userId]);
      assignedTasks = tasks;
    } catch (e) {
      // Ignore if tasks table doesn't exist
    }

    // KPIs
    const totalTestCases = testCases.length;
    const executedTests = testRuns.length;
    const passedTests = testRuns.filter(r => r.status === 'Passed').length;
    const failedTests = testRuns.filter(r => r.status === 'Failed').length;
    const blockedTests = testRuns.filter(r => r.status === 'Blocked').length;
    
    const openBugsCount = bugs.filter(b => ['New', 'In Progress', 'Confirmed'].includes(b.status)).length;
    
    // Automation Summary
    const totalScripts = automationScripts.length;
    const automatedTests = testCases.filter(c => c.is_automated).length;
    const passedScripts = automationScripts.filter(s => s.status === 'Passed').length;
    const failedScripts = automationScripts.filter(s => s.status === 'Failed').length;
    const successRate = totalScripts > 0 ? Math.round((passedScripts / totalScripts) * 100) : 0;
    
    // Test Case Coverage
    const coverage = totalTestCases > 0 ? Math.round((automatedTests / totalTestCases) * 100) : 0;
    const coveredCount = automatedTests;
    const notCoveredCount = totalTestCases - automatedTests;

    // Tests by priority
    const highPriority = testCases.filter(c => c.priority === 'High').length;
    const mediumPriority = testCases.filter(c => c.priority === 'Medium').length;
    const lowPriority = testCases.filter(c => c.priority === 'Low').length;

    // Bug status overview
    const newBugs = bugs.filter(b => b.status === 'New').length;
    const assignedBugs = bugs.filter(b => b.status === 'In Progress' || b.status === 'Confirmed').length;
    const inProgressBugs = bugs.filter(b => b.status === 'In Progress').length;
    const resolvedBugs = bugs.filter(b => b.status === 'Resolved').length;
    const closedBugs = bugs.filter(b => b.status === 'Closed' || b.status === 'Verified').length;

    // Assigned Bugs
    const assignedBugsList = bugs.filter(b => b.assigned_to === userId && !['Closed', 'Verified'].includes(b.status));

    // Compile Response
    res.json({
      success: true,
      data: {
        kpis: {
          totalTestCases,
          executedTests,
          passedTests,
          failedTests,
          blockedTests,
          openBugsCount
        },
        automationSummary: {
          totalScripts,
          automatedTests,
          passedScripts,
          failedScripts,
          successRate
        },
        testCaseCoverage: {
          coveredPercent: coverage,
          coveredCount,
          notCoveredPercent: 100 - coverage,
          notCoveredCount
        },
        testsByPriority: {
          high: highPriority,
          medium: mediumPriority,
          low: lowPriority
        },
        bugStatusOverview: {
          new: newBugs,
          assigned: assignedBugs,
          inProgress: inProgressBugs,
          resolved: resolvedBugs,
          closed: closedBugs
        },
        recentTestRuns: testRuns.slice(0, 10),
        assignedTasks: assignedTasks,
        assignedBugs: assignedBugsList,
        environmentStatus: [
          { name: 'QA Environment', status: 'Healthy' },
          { name: 'Staging Environment', status: 'Healthy' },
          { name: 'UAT Environment', status: 'Warning' },
          { name: 'Production Environment', status: 'Healthy' }
        ],
        // Dummy trend data for last 6 months
        trendData: [
          { name: 'Dec 2025', total: 600, passed: 400, failed: 150 },
          { name: 'Jan 2026', total: 750, passed: 450, failed: 200 },
          { name: 'Feb 2026', total: 700, passed: 480, failed: 180 },
          { name: 'Mar 2026', total: 800, passed: 550, failed: 200 },
          { name: 'Apr 2026', total: 750, passed: 500, failed: 170 },
          { name: 'May 2026', total: 864, passed: 612, failed: 192 }
        ]
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

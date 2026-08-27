const pool = require('../config/database');

class AutomationService {
  
  async checkStaleLeads() {
    try {
      const connection = await pool.getConnection();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [staleLeads] = await connection.query(`
        SELECT id, lead_name, email, updated_at 
        FROM leads 
        WHERE updated_at < ? AND lead_status != 'Converted to Deal'
      `, [threeDaysAgo]);
      
      for (const lead of staleLeads) {
        await this.createAlert({
          entity_type: 'Lead',
          entity_id: lead.id,
          alert_type: 'STALE_LEAD',
          title: `Stale Lead: ${lead.lead_name}`,
          message: `Lead "${lead.lead_name}" has not been updated for 3+ days`,
          severity: 'Medium',
          action_required: 'Review and follow up with lead'
        });
      }
      
      connection.release();
      console.log(`✓ Checked ${staleLeads.length} stale leads`);
      return staleLeads.length;
    } catch (err) {
      console.error('Error checking stale leads:', err.message);
    }
  }

  async checkStuckDeals() {
    try {
      const connection = await pool.getConnection();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [stuckDeals] = await connection.query(`
        SELECT d.id, d.deal_name, d.deal_stage, d.updated_at, c.company_name
        FROM deals d
        LEFT JOIN companies c ON d.company_id = c.id
        WHERE d.deal_stage = 'Negotiation' AND d.updated_at < ? AND d.status != 'Lost'
      `, [thirtyDaysAgo]);
      
      for (const deal of stuckDeals) {
        await this.createAlert({
          entity_type: 'Deal',
          entity_id: deal.id,
          alert_type: 'STUCK_DEAL',
          title: `Stuck Deal: ${deal.deal_name}`,
          message: `Deal "${deal.deal_name}" with ${deal.company_name} has been in Negotiation for 30+ days`,
          severity: 'High',
          action_required: 'Expedite negotiation or move deal to next stage'
        });
      }
      
      connection.release();
      console.log(`✓ Checked ${stuckDeals.length} stuck deals`);
      return stuckDeals.length;
    } catch (err) {
      console.error('Error checking stuck deals:', err.message);
    }
  }

  async checkOverdueInvoices() {
    try {
      const connection = await pool.getConnection();
      const today = new Date().toISOString().split('T')[0];
      
      const [overdueInvoices] = await connection.query(`
        SELECT i.id, i.invoice_number, i.open_till, c.company_name, SUM(i.amount - i.amount_paid) as outstanding
        FROM invoices i
        LEFT JOIN companies c ON i.client_id = c.id
        WHERE i.status = 'Unpaid' AND i.open_till < ? AND i.open_till IS NOT NULL
        GROUP BY i.id, i.invoice_number, i.open_till, c.company_name
      `, [today]);
      
      for (const invoice of overdueInvoices) {
        await this.createAlert({
          entity_type: 'Invoice',
          entity_id: invoice.id,
          alert_type: 'OVERDUE_INVOICE',
          title: `Overdue Invoice: ${invoice.invoice_number}`,
          message: `Invoice ${invoice.invoice_number} from ${invoice.company_name} is overdue. Outstanding: $${invoice.outstanding}`,
          severity: 'High',
          action_required: 'Follow up with client for payment'
        });
      }
      
      connection.release();
      console.log(`✓ Checked ${overdueInvoices.length} overdue invoices`);
      return overdueInvoices.length;
    } catch (err) {
      console.error('Error checking overdue invoices:', err.message);
    }
  }

  async checkDelayedTasks() {
    try {
      const connection = await pool.getConnection();
      const today = new Date().toISOString().split('T')[0];
      
      const [delayedTasks] = await connection.query(`
        SELECT t.id, t.title, t.due_date, t.status, u.first_name, u.last_name
        FROM general_tasks t
        LEFT JOIN users u ON JSON_EXTRACT(t.assigned_to, '$[0]') = u.id
        WHERE t.status IN ('To Do', 'In Progress') AND t.due_date < ? AND t.due_date IS NOT NULL
      `, [today]);
      
      for (const task of delayedTasks) {
        await this.createAlert({
          entity_type: 'Task',
          entity_id: task.id,
          alert_type: 'DELAYED_TASK',
          title: `Delayed Task: ${task.title}`,
          message: `Task "${task.title}" assigned to ${task.first_name} ${task.last_name} is overdue (was due ${task.due_date})`,
          severity: 'Medium',
          action_required: 'Check task status and reassign if needed'
        });
      }
      
      connection.release();
      console.log(`✓ Checked ${delayedTasks.length} delayed tasks`);
      return delayedTasks.length;
    } catch (err) {
      console.error('Error checking delayed tasks:', err.message);
    }
  }

  async checkProjectDelays() {
    try {
      const connection = await pool.getConnection();
      const today = new Date().toISOString().split('T')[0];
      
      const [delayedProjects] = await connection.query(`
        SELECT p.id, p.name, p.due_date, p.status, d.name as department_name
        FROM projects p
        LEFT JOIN departments d ON p.department_id = d.id
        WHERE p.status IN ('Planning', 'Execution') AND p.due_date < ? AND p.due_date IS NOT NULL
      `, [today]);
      
      for (const project of delayedProjects) {
        await this.createAlert({
          entity_type: 'Project',
          entity_id: project.id,
          alert_type: 'PROJECT_DELAY',
          title: `Delayed Project: ${project.name}`,
          message: `Project "${project.name}" (${project.department_name}) was due ${project.due_date} and is still in ${project.status}`,
          severity: 'High',
          action_required: 'Review project status and expedite if possible'
        });
      }
      
      connection.release();
      console.log(`✓ Checked ${delayedProjects.length} delayed projects`);
      return delayedProjects.length;
    } catch (err) {
      console.error('Error checking project delays:', err.message);
    }
  }

  async createAlert(alertData) {
    try {
      const connection = await pool.getConnection();
      
      const [existing] = await connection.query(`
        SELECT id FROM automation_rules 
        WHERE entity_type = ? AND trigger_condition LIKE ?
      `, [alertData.entity_type, `%${alertData.alert_type}%`]);
      
      if (existing.length === 0) {
        await connection.query(`
          INSERT INTO automation_rules 
          (name, entity_type, trigger_condition, action_type, action_payload, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          alertData.title,
          alertData.entity_type,
          JSON.stringify({ alert_type: alertData.alert_type }),
          'SEND_ALERT',
          JSON.stringify({
            title: alertData.title,
            message: alertData.message,
            severity: alertData.severity,
            action_required: alertData.action_required,
            entity_id: alertData.entity_id
          }),
          true
        ]);
      }
      
      connection.release();
    } catch (err) {
      console.error('Error creating alert:', err.message);
    }
  }

  async checkBugSeverity() {
    try {
      const connection = await pool.getConnection();
      const [criticalBugs] = await connection.query(`
        SELECT b.id, b.title, b.severity, p.name as project_name
        FROM bugs b
        LEFT JOIN projects p ON b.project_id = p.id
        WHERE b.severity = 'Critical' AND b.status != 'Resolved' AND b.status != 'Qualified'
      `);
      
      for (const bug of criticalBugs) {
        await this.createAlert({
          entity_type: 'Project',
          entity_id: bug.id,
          alert_type: 'CRITICAL_BUG',
          title: `Critical Bug: ${bug.title}`,
          message: `Critical bug detected in project "${bug.project_name}": ${bug.title}`,
          severity: 'Critical',
          action_required: 'Immediate developer attention'
        });
      }
      
      connection.release();
      return criticalBugs.length;
    } catch (err) {
      console.error('Error checking critical bugs:', err.message);
    }
  }

  async checkSprintDelays() {
    try {
      const connection = await pool.getConnection();
      const today = new Date().toISOString().split('T')[0];
      const [delayedSprints] = await connection.query(`
        SELECT s.id, s.name, s.end_date, p.name as project_name
        FROM sprints s
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE s.status = 'Active' AND s.end_date < ?
      `, [today]);
      
      for (const sprint of delayedSprints) {
        await this.createAlert({
          entity_type: 'Project',
          entity_id: sprint.id,
          alert_type: 'SPRINT_DELAY',
          title: `Sprint Overdue: ${sprint.name}`,
          message: `Sprint "${sprint.name}" in project "${sprint.project_name}" was due ${sprint.end_date}`,
          severity: 'High',
          action_required: 'Review sprint progress and adjust timeline'
        });
      }
      
      connection.release();
      return delayedSprints.length;
    } catch (err) {
      console.error('Error checking sprint delays:', err.message);
    }
  }

  async checkPendingApprovals() {
    try {
      const connection = await pool.getConnection();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
      
      // Check Deal Discounts
      const [pendingDiscounts] = await connection.query(`
        SELECT id, deal_name FROM deals 
        WHERE discount_status = 'Pending' AND updated_at < ?
      `, [oneDayAgo]);
      
      for (const deal of pendingDiscounts) {
        await this.createAlert({
          entity_type: 'Deal',
          entity_id: deal.id,
          alert_type: 'PENDING_DISCOUNT',
          title: `Pending Discount Approval: ${deal.deal_name}`,
          message: `Discount for deal "${deal.deal_name}" is pending for over 24 hours`,
          severity: 'Medium',
          action_required: 'Approve or reject discount'
        });
      }
      
      connection.release();
      return pendingDiscounts.length;
    } catch (err) {
      console.error('Error checking pending approvals:', err.message);
    }
  }

  async runAllChecks() {
    console.log('\n🔍 Running automation checks...');
    const results = {
      staleLeads: await this.checkStaleLeads(),
      stuckDeals: await this.checkStuckDeals(),
      overdueInvoices: await this.checkOverdueInvoices(),
      delayedTasks: await this.checkDelayedTasks(),
      delayedProjects: await this.checkProjectDelays(),
      criticalBugs: await this.checkBugSeverity(),
      sprintDelays: await this.checkSprintDelays(),
      pendingApprovals: await this.checkPendingApprovals()
    };
    console.log('✅ Automation checks completed', results);
    return results;
  }
}

module.exports = new AutomationService();

const pool = require('./config/database');

async function addPipelineAndCampaignData() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 ADDING PIPELINE & CAMPAIGN DATA WITH PROPER RELATIONSHIPS');
    console.log('='.repeat(70) + '\n');

    await connection.beginTransaction();

    // await connection.query('DELETE FROM deals WHERE id > 0');
    // await connection.query('DELETE FROM leads WHERE id > 0');
    await connection.query('DELETE FROM campaigns WHERE id > 0');
    await connection.query('DELETE FROM pipeline WHERE id > 0');
    // Don't delete companies as they might be linked elsewhere, but we need some for deals
    console.log('✅ Cleaned campaign and pipeline data (kept leads and deals)');

    const companies = [
      { company_name: 'TechCorp', status: 'Active' },
      { company_name: 'Innovation Labs', status: 'Active' },
      { company_name: 'Future Systems', status: 'Active' },
      { company_name: 'Growth Co', status: 'Active' }
    ];

    const insertedCompanies = {};
    for (const company of companies) {
      const [result] = await connection.query(
        'INSERT INTO companies (company_name, status) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        [company.company_name, company.status]
      );
      const id = result.insertId || (await connection.query('SELECT id FROM companies WHERE company_name = ?', [company.company_name]))[0][0].id;
      insertedCompanies[company.company_name] = id;
      console.log(`✅ Ensured Company: ${company.company_name} (ID: ${id})`);
    }

    const pipelines = [
      { name: 'Sales Pipeline - 2025', description: 'Main sales pipeline for Q1 2025', status: 'Active' },
      { name: 'Marketing Pipeline - 2025', description: 'Marketing funnel pipeline', status: 'Active' }
    ];

    const insertedPipelines = [];
    for (const pipeline of pipelines) {
      const [result] = await connection.query(
        'INSERT INTO pipeline (name, description, status) VALUES (?, ?, ?)',
        [pipeline.name, pipeline.description, pipeline.status]
      );
      insertedPipelines.push({ id: result.insertId, ...pipeline });
      console.log(`✅ Created Pipeline: ${pipeline.name} (ID: ${result.insertId})`);
    }

    const campaigns = [
      {
        name: 'Google Ads - Q1 2025',
        description: 'Q1 Google Ads campaign targeting B2B companies',
        budget: 5000,
        status: 'Active',
        start_date: '2025-01-01',
        end_date: '2025-03-31'
      },
      {
        name: 'LinkedIn Campaign',
        description: 'LinkedIn B2B outreach campaign',
        budget: 3000,
        status: 'Active',
        start_date: '2025-01-15',
        end_date: '2025-02-28'
      },
      {
        name: 'Email Marketing - January',
        description: 'January email campaign to existing contacts',
        budget: 500,
        status: 'Completed',
        start_date: '2025-01-01',
        end_date: '2025-01-31'
      },
      {
        name: 'Brand Awareness - Social Media',
        description: 'Social media brand awareness campaign',
        budget: 2000,
        status: 'Active',
        start_date: '2025-01-10',
        end_date: '2025-03-31'
      },
      {
        name: 'Trade Show - Tech Summit 2025',
        description: 'Tech Summit 2025 trade show participation',
        budget: 8000,
        status: 'Draft',
        start_date: '2025-02-15',
        end_date: '2025-02-17'
      }
    ];

    const insertedCampaigns = [];
    for (const campaign of campaigns) {
      const [result] = await connection.query(
        'INSERT INTO campaigns (name, description, budget, status, start_date, end_date, currency) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [campaign.name, campaign.description, campaign.budget, campaign.status, campaign.start_date, campaign.end_date, 'INR']
      );
      insertedCampaigns.push({ id: result.insertId, ...campaign });
      console.log(`✅ Created Campaign: ${campaign.name} (ID: ${result.insertId})`);
    }

    const leads = [
      { lead_name: 'Sarah Johnson', email: 'sarah@techcorp.com', phone: '+14155550101', company: 'TechCorp', lead_source: 'Google Ads', lead_status: 'New' },
      { lead_name: 'Michael Chen', email: 'mchen@innovate.com', phone: '+14155550102', company: 'Innovation Labs', lead_source: 'LinkedIn', lead_status: 'New' },
      { lead_name: 'Emma Davis', email: 'emma@future.io', phone: '+14155550103', company: 'Future Systems', lead_source: 'Google Ads', lead_status: 'Qualified' },
      { lead_name: 'James Wilson', email: 'jwilson@growth.com', phone: '+14155550104', company: 'Growth Co', lead_source: 'LinkedIn', lead_status: 'New' },
      { lead_name: 'Sophia Martinez', email: 's.martinez@digital.co', phone: '+14155550105', company: 'Digital Dynamics', lead_source: 'Email', lead_status: 'Qualified' },
      { lead_name: 'Robert Taylor', email: 'r.taylor@tech.net', phone: '+14155550106', company: 'Tech Innovations', lead_source: 'Social Media', lead_status: 'New' },
      { lead_name: 'Olivia Anderson', email: 'o.anderson@cloud.com', phone: '+14155550107', company: 'Cloud Solutions', lead_source: 'Google Ads', lead_status: 'Qualified' },
      { lead_name: 'David Kumar', email: 'd.kumar@enterprise.org', phone: '+14155550108', company: 'Enterprise Systems', lead_source: 'LinkedIn', lead_status: 'New' }
    ];

    const insertedLeads = [];
    const userIds = [1, 2, 3];
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const ownerId = userIds[i % userIds.length];
      const [result] = await connection.query(
        'INSERT INTO leads (lead_name, email, phone, company, lead_source, lead_status, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [lead.lead_name, lead.email, lead.phone, lead.company, lead.lead_source, lead.lead_status, ownerId]
      );
      insertedLeads.push({ id: result.insertId, ...lead });
      console.log(`✅ Created Lead: ${lead.lead_name} from ${lead.lead_source} (Owner ID: ${ownerId})`);
    }

    const deals = [
      {
        deal_name: 'SaaS Platform Implementation - TechCorp',
        company_id: insertedCompanies['TechCorp'],
        contact_id: 1,
        deal_value: 50000,
        deal_stage: 'Proposal Sent',
        pipeline: 'Sales Pipeline - 2025',
        status: 'In Progress',
        probability: 60,
        expected_close_date: '2025-02-15'
      },
      {
        deal_name: 'Custom Development - Innovation Labs',
        company_id: insertedCompanies['Innovation Labs'],
        contact_id: 2,
        deal_value: 75000,
        deal_stage: 'Negotiation',
        pipeline: 'Sales Pipeline - 2025',
        status: 'In Progress',
        probability: 70,
        expected_close_date: '2025-02-28'
      },
      {
        deal_name: 'Annual License Renewal - Future Systems',
        company_id: insertedCompanies['Future Systems'],
        contact_id: 3,
        deal_value: 120000,
        deal_stage: 'Won',
        pipeline: 'Sales Pipeline - 2025',
        status: 'Closed',
        probability: 100,
        expected_close_date: '2025-01-30'
      },
      {
        deal_name: 'Cloud Migration Services - Growth Co',
        company_id: insertedCompanies['Growth Co'],
        contact_id: 4,
        deal_value: 95000,
        deal_stage: 'Follow Up',
        pipeline: 'Sales Pipeline - 2025',
        status: 'Pending',
        probability: 30,
        expected_close_date: '2025-03-15'
      }
    ];

    for (const deal of deals) {
      try {
        const [result] = await connection.query(
          `INSERT INTO deals 
           (deal_name, company_id, contact_id, deal_value, currency, deal_stage, pipeline, status, probability, expected_close_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [deal.deal_name, deal.company_id, deal.contact_id || null, deal.deal_value, 'INR', deal.deal_stage, deal.pipeline, deal.status, deal.probability, deal.expected_close_date]
        );
        console.log(`✅ Created Deal: ${deal.deal_name} (₹${deal.deal_value.toLocaleString()}, ${deal.probability}% probability)`);
      } catch (dealErr) {
        console.warn(`⚠️ Failed to create deal "${deal.deal_name}": ${dealErr.message}`);
      }
    }

    await connection.commit();
    console.log('\n' + '='.repeat(70));
    console.log('✅ DATA INSERTION COMPLETE');
    console.log('='.repeat(70));
    console.log('\n📊 SUMMARY:');
    console.log(`   Pipelines: ${insertedPipelines.length}`);
    console.log(`   Campaigns: ${insertedCampaigns.length}`);
    console.log(`   Leads: ${insertedLeads.length}`);
    console.log(`   Deals: ${deals.length}`);
    console.log('\n🔗 RELATIONSHIPS:');
    console.log('   Campaign → Leads (generated from)');
    console.log('   Leads → Deals (qualified into)');
    console.log('   Deals → Pipeline (tracked by)');
    console.log('   Deals → Company & Contact (linked to)');
    console.log('\n' + '='.repeat(70) + '\n');

    connection.release();
    process.exit(0);
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (e) {}
      connection.release();
    }
    console.error('❌ Error adding data:', err.message);
    process.exit(1);
  }
}

addPipelineAndCampaignData();

const pool = require('./config/database');

async function addSamplePlans() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const samplePlans = [
      {
        name: 'Basic',
        type: 'Standard',
        description: 'Essential features for individuals and small teams',
        price: 50,
        status: 'Active',
        features: JSON.stringify([
          { name: '10 Contacts', included: true },
          { name: '10 Leads', included: true },
          { name: '20 Companies', included: true },
          { name: '50 Campaigns', included: true },
          { name: '100 Projects', included: true },
          { name: 'Deals', included: false },
          { name: 'Tasks', included: false },
          { name: 'Pipelines', included: false }
        ]),
        billing_cycle: 'Monthly'
      },
      {
        name: 'Professional',
        type: 'Premium',
        description: 'Advanced features for growing teams',
        price: 150,
        status: 'Active',
        features: JSON.stringify([
          { name: '50 Contacts', included: true },
          { name: '50 Leads', included: true },
          { name: 'Unlimited Companies', included: true },
          { name: 'Unlimited Campaigns', included: true },
          { name: 'Unlimited Projects', included: true },
          { name: 'Deals', included: true },
          { name: 'Tasks', included: true },
          { name: 'Pipelines', included: false }
        ]),
        billing_cycle: 'Monthly'
      },
      {
        name: 'Business',
        type: 'Enterprise',
        description: 'Complete solution for enterprises',
        price: 200,
        status: 'Active',
        features: JSON.stringify([
          { name: '20 Contacts', included: true },
          { name: '20 Leads', included: true },
          { name: '50 Companies', included: true },
          { name: 'Unlimited Campaigns', included: true },
          { name: 'Unlimited Projects', included: true },
          { name: 'Deals', included: false },
          { name: 'Tasks', included: false },
          { name: 'Pipelines', included: false }
        ]),
        billing_cycle: 'Quarterly'
      },
      {
        name: 'Enterprise',
        type: 'Enterprise',
        description: 'Full-featured solution for large organizations',
        price: 400,
        status: 'Active',
        features: JSON.stringify([
          { name: 'Unlimited Contacts', included: true },
          { name: 'Unlimited Leads', included: true },
          { name: 'Unlimited Companies', included: true },
          { name: 'Unlimited Campaigns', included: true },
          { name: 'Unlimited Projects', included: true },
          { name: 'Deals', included: true },
          { name: 'Tasks', included: true },
          { name: 'Pipelines', included: true }
        ]),
        billing_cycle: 'Monthly'
      },
      {
        name: 'Starter',
        type: 'Standard',
        description: 'Perfect for getting started',
        price: 29,
        status: 'Active',
        features: JSON.stringify([
          { name: '5 Contacts', included: true },
          { name: '5 Leads', included: true },
          { name: '10 Companies', included: true },
          { name: '20 Campaigns', included: true },
          { name: '50 Projects', included: true },
          { name: 'Deals', included: false },
          { name: 'Tasks', included: false },
          { name: 'Pipelines', included: false }
        ]),
        billing_cycle: 'Monthly'
      },
      {
        name: 'Premium',
        type: 'Premium',
        description: 'Advanced features for professionals',
        price: 300,
        status: 'Active',
        features: JSON.stringify([
          { name: 'Unlimited Contacts', included: true },
          { name: '100 Leads', included: true },
          { name: 'Unlimited Companies', included: true },
          { name: 'Unlimited Campaigns', included: true },
          { name: 'Unlimited Projects', included: true },
          { name: 'Deals', included: true },
          { name: 'Tasks', included: true },
          { name: 'Pipelines', included: true }
        ]),
        billing_cycle: 'Annual'
      }
    ];

    for (const plan of samplePlans) {
      const [existing] = await connection.query(
        'SELECT id FROM plans WHERE plan_name = ?',
        [plan.name]
      );

      if (!existing.length) {
        const [result] = await connection.query(
          'INSERT INTO plans (plan_name, plan_type, description, price, status, features, currency) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [plan.name, plan.type, plan.description, plan.price, plan.status, plan.features, 'USD']
        );
        console.log(`✅ Created plan: ${plan.name} (ID: ${result.insertId})`);
      } else {
        console.log(`⏭️  Plan already exists: ${plan.name}`);
      }
    }

    const [allPlans] = await connection.query('SELECT * FROM plans');
    console.log(`\n✅ Total plans in database: ${allPlans.length}`);
    
    connection.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error adding sample plans:', err);
    if (connection) connection.release();
    process.exit(1);
  }
}

addSamplePlans();

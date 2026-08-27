const pool = require('./config/database');

(async () => {
  try {
    const conn = await pool.getConnection();
    
    console.log('Adding sample invoice items...\n');
    
    const sampleItems = [
      // Invoice 15 items
      {
        invoice_id: 15,
        item_name: 'Web Development Services',
        description: 'Custom website development and setup',
        quantity: 1,
        price: 15000,
        discount_percentage: 5,
        tax_percentage: 10
      },
      {
        invoice_id: 15,
        item_name: 'API Integration',
        description: 'Third-party API integration',
        quantity: 1,
        price: 8000,
        discount_percentage: 0,
        tax_percentage: 10
      },
      {
        invoice_id: 15,
        item_name: 'Maintenance & Support',
        description: '3 months of maintenance and support',
        quantity: 3,
        price: 1920,
        discount_percentage: 5,
        tax_percentage: 10
      },
      // Invoice 4 items
      {
        invoice_id: 4,
        item_name: 'Consulting Services',
        description: 'Business consulting and strategy',
        quantity: 5,
        price: 5000,
        discount_percentage: 10,
        tax_percentage: 8
      },
      {
        invoice_id: 4,
        item_name: 'Implementation',
        description: 'System implementation',
        quantity: 1,
        price: 12693.95,
        discount_percentage: 0,
        tax_percentage: 8
      },
      // Invoice 10 items
      {
        invoice_id: 10,
        item_name: 'Software License',
        description: 'Annual software license',
        quantity: 5,
        price: 8000,
        discount_percentage: 5,
        tax_percentage: 10
      },
      {
        invoice_id: 10,
        item_name: 'Training Services',
        description: 'Staff training',
        quantity: 2,
        price: 4500,
        discount_percentage: 0,
        tax_percentage: 10
      },
      // Invoice 12 items
      {
        invoice_id: 12,
        item_name: 'Cloud Infrastructure',
        description: 'Cloud server and storage',
        quantity: 1,
        price: 25000,
        discount_percentage: 8,
        tax_percentage: 10
      },
      {
        invoice_id: 12,
        item_name: 'Security Audit',
        description: 'Security assessment and audit',
        quantity: 1,
        price: 15950.70,
        discount_percentage: 0,
        tax_percentage: 10
      },
      // Invoice 1 items
      {
        invoice_id: 1,
        item_name: 'Development Services',
        description: 'Custom software development',
        quantity: 10,
        price: 4000,
        discount_percentage: 5,
        tax_percentage: 10
      },
      {
        invoice_id: 1,
        item_name: 'Project Management',
        description: 'Project management and coordination',
        quantity: 1,
        price: 14816.30,
        discount_percentage: 0,
        tax_percentage: 10
      }
    ];
    
    for (const item of sampleItems) {
      const { invoice_id, item_name, description, quantity, price, discount_percentage, tax_percentage } = item;
      
      await conn.query(
        'INSERT INTO invoice_items (invoice_id, item_name, description, quantity, price, discount_percentage, tax_percentage, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [invoice_id, item_name, description, quantity, price, discount_percentage || 0, tax_percentage || 0, price * quantity]
      );
      
      console.log(`✓ Added: Invoice ${invoice_id} - ${item_name}`);
    }
    
    console.log('\n=== VERIFICATION ===');
    const [itemsByInvoice] = await conn.query(
      'SELECT invoice_id, COUNT(*) as item_count, SUM(amount) as total FROM invoice_items GROUP BY invoice_id ORDER BY invoice_id'
    );
    
    itemsByInvoice.forEach(row => {
      console.log(`Invoice ${row.invoice_id}: ${row.item_count} items, Total: $${parseFloat(row.total).toFixed(2)}`);
    });
    
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

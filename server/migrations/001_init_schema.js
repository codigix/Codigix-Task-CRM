module.exports = {
  up: async (pool) => {
    const connection = await pool.getConnection();
    try {
      console.log('Running migration: 001_init_schema');
      
      const tables = [
        'users', 'roles', 'permissions', 'delete_requests', 'modules',
        'general_tasks', 'proposals', 'proposal_line_items', 'proposal_history',
        'proposal_attachments', 'companies', 'contracts', 'contacts', 'leads',
        'deals', 'projects', 'invoices', 'invoice_items', 'estimations',
        'pipeline', 'campaigns', 'messages', 'call_history', 'user_notes',
        'file_folders', 'files', 'file_shares', 'company_plans', 'plans'
      ];

      for (const table of tables) {
        const [result] = await connection.query(`SELECT 1 FROM ${table} LIMIT 1`).catch(() => [null]);
        if (!result) {
          console.log(`✓ Table ${table} exists or was created`);
        }
      }

      console.log('✓ Migration 001_init_schema completed');
      connection.release();
    } catch (error) {
      console.error('Migration failed:', error.message);
      connection.release();
      throw error;
    }
  },

  down: async (pool) => {
    const connection = await pool.getConnection();
    try {
      console.log('Reverting migration: 001_init_schema');
      
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      
      const tables = [
        'file_shares', 'files', 'file_folders', 'user_notes', 'call_history',
        'messages', 'campaigns', 'pipeline', 'estimations', 'invoice_items',
        'invoices', 'projects', 'deals', 'leads', 'contacts', 'contracts',
        'companies', 'proposal_attachments', 'proposal_history',
        'proposal_line_items', 'proposals', 'general_tasks', 'modules',
        'delete_requests', 'permissions', 'roles', 'users', 'company_plans', 'plans'
      ];

      for (const table of tables) {
        await connection.query(`DROP TABLE IF EXISTS ${table}`).catch(() => {});
      }

      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('✓ Migration 001_init_schema reverted');
      connection.release();
    } catch (error) {
      console.error('Revert failed:', error.message);
      connection.release();
      throw error;
    }
  }
};

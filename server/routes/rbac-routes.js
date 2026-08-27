module.exports = function setupRBACRoutes(app, pool) {

  // Get all roles
  app.get('/api/roles', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const [roles] = await connection.query('SELECT * FROM roles ORDER BY name ASC');
      connection.release();
      return res.json(roles);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching roles:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch roles',
        details: error.message
      });
    }
  });

  // Create new role
  app.post('/api/roles', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { name, description } = req.body;

      const [result] = await connection.query(
        'INSERT INTO roles (name, description) VALUES (?, ?)',
        [name, description || '']
      );

      connection.release();

      res.json({
        success: true,
        message: 'Role created successfully',
        role_id: result.insertId
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error creating role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create role',
        details: error.message
      });
    }
  });

  // Update role
  app.put('/api/roles/:id', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { id } = req.params;
      const { name, description } = req.body;

      await connection.query(
        'UPDATE roles SET name = ?, description = ? WHERE id = ?',
        [name, description || '', id]
      );

      connection.release();

      res.json({
        success: true,
        message: 'Role updated successfully'
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error updating role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update role',
        details: error.message
      });
    }
  });

  // Delete role
  app.delete('/api/roles/:id', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { id } = req.params;

      // Check if role has users
      const [users] = await connection.query('SELECT COUNT(*) as count FROM users WHERE role_id = ?', [id]);

      if (users[0].count > 0) {
        connection.release();
        return res.status(400).json({
          success: false,
          error: 'Cannot delete role with assigned users'
        });
      }

      await connection.query('DELETE FROM permissions WHERE role_id = ?', [id]);
      await connection.query('DELETE FROM roles WHERE id = ?', [id]);

      connection.release();

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error deleting role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete role',
        details: error.message
      });
    }
  });

  // Get all permissions
  app.get('/api/roles/permissions/all', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const [permissions] = await connection.query('SELECT * FROM permissions ORDER BY role_id, module_name');
      connection.release();
      return res.json(permissions);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching permissions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch permissions',
        details: error.message
      });
    }
  });

  // Get permissions for a role
  app.get('/api/roles/:roleId/permissions', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { roleId } = req.params;

      const [permissions] = await connection.query(
        'SELECT * FROM permissions WHERE role_id = ? ORDER BY module_name',
        [roleId]
      );

      connection.release();
      return res.json(permissions);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching role permissions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch permissions',
        details: error.message
      });
    }
  });

  // Update permission
  app.put('/api/roles/:roleId/permissions', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { roleId } = req.params;
      const { module_name, action, has_permission } = req.body;

      // Check if permission record exists
      const [existing] = await connection.query(
        'SELECT id FROM permissions WHERE role_id = ? AND module_name = ?',
        [roleId, module_name]
      );

      if (existing.length > 0) {
        const updateObj = {};
        updateObj[action] = has_permission ? 1 : 0;

        const setClause = Object.keys(updateObj).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateObj);
        values.push(roleId, module_name);

        await connection.query(
          `UPDATE permissions SET ${setClause} WHERE role_id = ? AND module_name = ?`,
          values
        );
      } else {
        // Create new permission record
        const permObj = {
          can_create: 0,
          can_read: 0,
          can_update: 0,
          can_delete: 0
        };
        permObj[action] = has_permission ? 1 : 0;

        await connection.query(
          'INSERT INTO permissions (role_id, module_name, can_create, can_read, can_update, can_delete) VALUES (?, ?, ?, ?, ?, ?)',
          [roleId, module_name, permObj.can_create, permObj.can_read, permObj.can_update, permObj.can_delete]
        );
      }

      connection.release();

      res.json({
        success: true,
        message: 'Permission updated successfully'
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error updating permission:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update permission',
        details: error.message
      });
    }
  });

  // Get role with its permissions and users
  app.get('/api/roles/:roleId/details', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { roleId } = req.params;

      const [role] = await connection.query('SELECT * FROM roles WHERE id = ?', [roleId]);
      const [permissions] = await connection.query('SELECT * FROM permissions WHERE role_id = ?', [roleId]);
      const [users] = await connection.query('SELECT id, first_name, last_name, email FROM users WHERE role_id = ?', [roleId]);

      connection.release();

      if (role.length === 0) {
        return res.status(404).json({ error: 'Role not found' });
      }

      return res.json({
        role: role[0],
        permissions,
        users
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching role details:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch role details',
        details: error.message
      });
    }
  });

  // Assign role to user
  app.post('/api/users/:userId/assign-role', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { userId } = req.params;
      const { roleId } = req.body;

      await connection.query('UPDATE users SET role_id = ? WHERE id = ?', [roleId, userId]);

      connection.release();

      res.json({
        success: true,
        message: 'Role assigned to user successfully'
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error assigning role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign role',
        details: error.message
      });
    }
  });

  // Check user permissions
  app.post('/api/users/:userId/check-permission', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();
      const { userId } = req.params;
      const { module_name, action } = req.body;

      const [user] = await connection.query('SELECT role_id FROM users WHERE id = ?', [userId]);

      if (user.length === 0) {
        connection.release();
        return res.json({ hasPermission: false });
      }

      const actionKey = `can_${action.toLowerCase()}`;
      const [permission] = await connection.query(
        `SELECT ${actionKey} FROM permissions WHERE role_id = ? AND module_name = ?`,
        [user[0].role_id, module_name]
      );

      connection.release();

      const hasPermission = permission.length > 0 && permission[0][actionKey] === 1;

      res.json({ hasPermission });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error checking permission:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check permission',
        details: error.message
      });
    }
  });

  // Get access control matrix
  app.get('/api/rbac/matrix', async (req, res) => {
    let connection;
    try {
      connection = await pool.getConnection();

      const [roles] = await connection.query('SELECT * FROM roles ORDER BY name ASC');
      const [permissions] = await connection.query('SELECT * FROM permissions ORDER BY role_id, module_name');
      const [modules] = await connection.query('SELECT DISTINCT module_name FROM permissions ORDER BY module_name');

      connection.release();

      const matrix = roles.map(role => ({
        role,
        permissions: permissions.filter(p => p.role_id === role.id),
        userCount: 0
      }));

      res.json({
        roles: matrix,
        modules: modules.map(m => m.module_name)
      });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching matrix:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch access control matrix',
        details: error.message
      });
    }
  });
};

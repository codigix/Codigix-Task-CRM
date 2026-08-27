const multer = require('multer');
const path = require('path');
const fs = require('fs');

module.exports = function setupFilesConversationsRoutes(app, pool) {

  // Configure storage
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });
  const upload = multer({ storage: storage });

  async function getConnection() {
    return pool.getConnection();
  }

  const responseError = (res, statusCode, message, error) => {
    console.error(`Error: ${message}`, error?.message || error);
    return res.status(statusCode).json({ error: message, details: error?.message || error });
  };

  app.get('/api/files', async (req, res) => {
    let connection;
    try {
      const { userId, lead_id, contact_id, company_id, deal_id, project_id, task_id, skip = 0, limit = 50 } = req.query;
      connection = await getConnection();

      let query = `
        SELECT f.*, u.first_name, u.last_name 
        FROM files f 
        LEFT JOIN users u ON f.user_id = u.id 
        WHERE 1=1
      `;
      const params = [];

      if (userId) {
        query += ' AND f.user_id = ?';
        params.push(userId);
      }
      if (lead_id) {
        query += ' AND f.lead_id = ?';
        params.push(lead_id);
      }
      if (contact_id) {
        query += ' AND f.contact_id = ?';
        params.push(contact_id);
      }
      if (company_id) {
        query += ' AND f.company_id = ?';
        params.push(company_id);
      }
      if (deal_id) {
        query += ' AND f.deal_id = ?';
        params.push(deal_id);
      }
      if (project_id) {
        query += ' AND f.project_id = ?';
        params.push(project_id);
      }
      if (task_id) {
        query += ' AND f.task_id = ?';
        params.push(task_id);
      }

      query += ' ORDER BY f.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [files] = await connection.query(query, params);
      res.json(files);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch files', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/files', async (req, res) => {
    let connection;
    try {
      const { 
        userId, name, fileType, sizeBytes, mimeType, storageType, folderId,
        lead_id, contact_id, company_id, deal_id, project_id, task_id
      } = req.body;

      if (!userId || !name) {
        return res.status(400).json({ error: 'User ID and file name required' });
      }

      connection = await getConnection();
      const [result] = await connection.query(`
        INSERT INTO files (
          user_id, folder_id, name, file_type, size_bytes, mime_type, storage_type,
          lead_id, contact_id, company_id, deal_id, project_id, task_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, folderId || null, name, fileType || null, sizeBytes || 0, mimeType || null, storageType || 'Internal',
        lead_id || null, contact_id || null, company_id || null, deal_id || null, project_id || null, task_id || null
      ]);

      const [file] = await connection.query('SELECT * FROM files WHERE id = ?', [result.insertId]);
      res.status(201).json(file[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to create file record', error);
    } finally {
      if (connection) connection.release();
    }
  });

  // Physical file upload endpoint
  app.post('/api/files/upload', upload.single('file'), async (req, res) => {
    let connection;
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { userId, project_id, lead_id, contact_id, company_id, deal_id, task_id, folderId } = req.body;
      const filePath = `/uploads/${req.file.filename}`;

      connection = await getConnection();
      const [result] = await connection.query(`
        INSERT INTO files (
          user_id, folder_id, name, file_type, size_bytes, mime_type, storage_type, file_path,
          lead_id, contact_id, company_id, deal_id, project_id, task_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId ? parseInt(userId) : 1, 
        folderId ? parseInt(folderId) : null, 
        req.file.originalname, 
        path.extname(req.file.originalname).substring(1).toUpperCase() || 'FILE', 
        req.file.size, req.file.mimetype, 'Internal', filePath,
        lead_id ? parseInt(lead_id) : null, 
        contact_id ? parseInt(contact_id) : null, 
        company_id ? parseInt(company_id) : null, 
        deal_id ? parseInt(deal_id) : null, 
        project_id ? parseInt(project_id) : null, 
        task_id ? parseInt(task_id) : null
      ]);

      const [file] = await connection.query('SELECT * FROM files WHERE id = ?', [result.insertId]);
      res.status(201).json(file[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to upload file', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.put('/api/files/:fileId/favorite', async (req, res) => {
    let connection;
    try {
      const { fileId } = req.params;
      const { isFavorite } = req.body;

      connection = await getConnection();
      await connection.query('UPDATE files SET is_favorite = ? WHERE id = ?', [isFavorite, fileId]);

      const [file] = await connection.query('SELECT * FROM files WHERE id = ?', [fileId]);
      res.json(file[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to update file favorite', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/files/:fileId', async (req, res) => {
    let connection;
    try {
      const { fileId } = req.params;
      connection = await getConnection();

      await connection.query('DELETE FROM files WHERE id = ?', [fileId]);
      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to delete file', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/folders', async (req, res) => {
    let connection;
    try {
      const { userId, skip = 0, limit = 50 } = req.query;
      connection = await getConnection();

      let query = 'SELECT f.* FROM file_folders f WHERE 1=1';
      const params = [];

      if (userId) {
        query += ' AND f.user_id = ?';
        params.push(userId);
      }

      query += ' ORDER BY f.created_at DESC LIMIT ?, ?';
      params.push(parseInt(skip), parseInt(limit));

      const [folders] = await connection.query(query, params);
      res.json(folders);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch folders', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/folders', async (req, res) => {
    let connection;
    try {
      const { userId, name, parentId, storageType } = req.body;

      if (!userId || !name) {
        return res.status(400).json({ error: 'User ID and folder name required' });
      }

      connection = await getConnection();
      const [result] = await connection.query(`
        INSERT INTO file_folders (user_id, name, parent_id, storage_type)
        VALUES (?, ?, ?, ?)
      `, [userId, name, parentId || null, storageType || 'Internal']);

      const [folder] = await connection.query('SELECT * FROM file_folders WHERE id = ?', [result.insertId]);
      res.status(201).json(folder[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to create folder', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/folders/:folderId', async (req, res) => {
    let connection;
    try {
      const { folderId } = req.params;
      connection = await getConnection();

      await connection.query('DELETE FROM file_folders WHERE id = ?', [folderId]);
      res.json({ message: 'Folder deleted successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to delete folder', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/files/storage-stats', async (req, res) => {
    let connection;
    try {
      const { userId } = req.query;
      connection = await getConnection();

      let query = `
        SELECT 
          storage_type,
          COUNT(*) as file_count,
          SUM(size_bytes) as total_size
        FROM files
        WHERE 1=1
      `;
      const params = [];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      query += ' GROUP BY storage_type ORDER BY storage_type';

      const [stats] = await connection.query(query, params);
      res.json(stats);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch storage stats', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/conversations/:userId', async (req, res) => {
    let connection;
    try {
      const { userId } = req.params;
      connection = await getConnection();

      // Query 1: Direct conversations
      const query1 = `
        SELECT 
          c.id,
          'private' as chat_type,
          c.participant1_id,
          c.participant2_id,
          c.last_message_text,
          c.last_message_timestamp,
          c.created_at,
          c.updated_at,
          CASE 
            WHEN c.participant1_id = ? THEN u2.id
            ELSE u1.id
          END as other_user_id,
          CASE 
            WHEN c.participant1_id = ? THEN CONCAT(u2.first_name, ' ', u2.last_name)
            ELSE CONCAT(u1.first_name, ' ', u1.last_name)
          END as name,
          CASE 
            WHEN c.participant1_id = ? THEN u2.avatar
            ELSE u1.avatar
          END as avatar,
          CASE 
            WHEN c.participant1_id = ? THEN u2.status
            ELSE u1.status
          END as status,
          CASE 
            WHEN c.participant1_id = ? THEN u2.last_seen
            ELSE u1.last_seen
          END as last_seen,
          c.last_message_text as lastMessage,
          DATE_FORMAT(c.last_message_timestamp, '%M %d, %Y %H:%i') as timestamp
        FROM conversations c
        LEFT JOIN users u1 ON c.participant1_id = u1.id
        LEFT JOIN users u2 ON c.participant2_id = u2.id
        WHERE c.participant1_id = ? OR c.participant2_id = ?
      `;

      // Query 2: Group chats
      const query2 = `
        SELECT 
          g.id,
          'group' as chat_type,
          NULL as participant1_id,
          NULL as participant2_id,
          NULL as last_message_text,
          NULL as last_message_timestamp,
          g.created_at,
          g.updated_at,
          NULL as other_user_id,
          g.name as name,
          g.avatar as avatar,
          'Active' as status,
          'Group Chat' as lastMessage,
          DATE_FORMAT(g.created_at, '%M %d, %Y %H:%i') as timestamp
        FROM chat_groups g
        INNER JOIN chat_group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = ?
      `;

      const [directConvs] = await connection.query(query1, [userId, userId, userId, userId, userId, userId, userId]);
      const [groupConvs] = await connection.query(query2, [userId]);

      const mergedConversations = [...directConvs, ...groupConvs].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB - dateA;
      });

      res.json(mergedConversations);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch conversations', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/chat-groups', async (req, res) => {
    let connection;
    try {
      const { name, description, created_by, members = [] } = req.body;
      connection = await getConnection();
      await connection.beginTransaction();

      const [groupResult] = await connection.query(
        'INSERT INTO chat_groups (name, description, created_by) VALUES (?, ?, ?)',
        [name, description, created_by]
      );
      
      const groupId = groupResult.insertId;

      // Add creator as Admin
      await connection.query(
        'INSERT INTO chat_group_members (group_id, user_id, role) VALUES (?, ?, ?)',
        [groupId, created_by, 'Admin']
      );

      // Add other members
      for (const userId of members) {
        if (userId !== created_by) {
          await connection.query(
            'INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)',
            [groupId, userId]
          );
        }
      }

      await connection.commit();
      res.status(201).json({ id: groupId, name, description, members_count: members.length + 1 });
    } catch (error) {
      if (connection) await connection.rollback();
      responseError(res, 500, 'Failed to create group', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/chat-groups/:groupId/members', async (req, res) => {
    let connection;
    try {
      const { groupId } = req.params;
      connection = await getConnection();
      const query = 'SELECT u.id, u.first_name, u.last_name, u.email, u.avatar, gm.role, gm.joined_at ' +
                    'FROM users u ' +
                    'INNER JOIN chat_group_members gm ON u.id = gm.user_id ' +
                    'WHERE gm.group_id = ?';
      const [members] = await connection.query(query, [groupId]);
      res.json(members);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch group members', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/chat-groups/:groupId/members', async (req, res) => {
    let connection;
    try {
      const { groupId } = req.params;
      const { members = [] } = req.body;
      
      if (!members || members.length === 0) {
        return res.status(400).json({ error: 'No members provided' });
      }

      connection = await getConnection();
      await connection.beginTransaction();

      // Get existing members to avoid duplicates
      const [existing] = await connection.query(
        'SELECT user_id FROM chat_group_members WHERE group_id = ?',
        [groupId]
      );
      const existingUserIds = existing.map(row => row.user_id.toString());

      let addedCount = 0;
      for (const userId of members) {
        if (!existingUserIds.includes(userId.toString())) {
          await connection.query(
            'INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)',
            [groupId, userId]
          );
          addedCount++;
        }
      }

      await connection.commit();
      res.status(201).json({ message: `Added ${addedCount} new members to group` });
    } catch (error) {
      if (connection) await connection.rollback();
      responseError(res, 500, 'Failed to add group members', error);
    } finally {
      if (connection) connection.release();
    }
  });


  app.post('/api/messages', (req, res, next) => {
    if (req.is && req.is('multipart/form-data')) {
      upload.single('file')(req, res, (err) => {
        if (err) console.error('Multer error:', err);
        next();
      });
    } else {
      next();
    }
  }, async (req, res) => {
    let connection;
    try {
      const body = req.body || {};
      const parseId = (val) => {
        if (!val || val === 'undefined' || val === 'null') return null;
        const cleaned = String(val).replace(/\D/g, '');
        return cleaned ? parseInt(cleaned, 10) : null;
      };

      const sender_id = parseId(body.sender_id);
      const receiver_id = parseId(body.receiver_id);
      const group_id = parseId(body.group_id);
      const message_text = body.message_text || body.message || body.text || '';

      let file_name = body.file_name;
      let file_size = body.file_size;
      let file_type = body.file_type;
      let file_path = body.file_path;

      if (req.file) {
        file_name = req.file.originalname;
        file_size = req.file.size;
        file_type = req.file.mimetype;
        file_path = `/uploads/${req.file.filename}`;
      }

      if (!sender_id || (!receiver_id && !group_id) || (!message_text && !file_name)) {
        return res.status(400).json({ error: 'Sender ID, (Receiver ID or Group ID), and message text or file required' });
      }

      connection = await getConnection();

      let conversation_id = null;
      if (receiver_id) {
        // One-on-one message
        const [conv] = await connection.query(
          'SELECT id FROM conversations WHERE (participant1_id = ? AND participant2_id = ?) OR (participant1_id = ? AND participant2_id = ?)',
          [sender_id, receiver_id, receiver_id, sender_id]
        );

        if (conv.length > 0) {
          conversation_id = conv[0].id;
        } else {
          const [newConv] = await connection.query(
            'INSERT INTO conversations (participant1_id, participant2_id) VALUES (?, ?)',
            [sender_id, receiver_id]
          );
          conversation_id = newConv.insertId;
        }
      }

      const reply_to_id = parseId(body.reply_to_id);
      const reply_to_text = body.reply_to_text || null;
      const reply_to_sender = body.reply_to_sender || null;

      const insertMsgQuery = 'INSERT INTO messages (sender_id, receiver_id, conversation_id, group_id, message_text, file_name, file_size, file_type, file_path, reply_to_id, reply_to_text, reply_to_sender) ' +
                             'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      const [result] = await connection.query(insertMsgQuery, [
        sender_id, 
        receiver_id || null, 
        conversation_id, 
        group_id || null, 
        message_text || '', 
        file_name || null, 
        file_size || null, 
        file_type || null,
        file_path || null,
        reply_to_id || null,
        reply_to_text || null,
        reply_to_sender || null
      ]);

      if (conversation_id) {
        await connection.query(
          'UPDATE conversations SET last_message_text = ?, last_message_timestamp = CURRENT_TIMESTAMP WHERE id = ?',
          [message_text || '[Attachment]', conversation_id]
        );
      }

      const [message] = await connection.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
      res.status(201).json(message[0]);
    } catch (error) {
      console.error('Error in POST /api/messages:', error);
      responseError(res, 500, 'Failed to send message', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.put('/api/messages/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { message_text } = req.body;
      if (!message_text) return res.status(400).json({ error: 'message_text required' });

      connection = await getConnection();
      await connection.query(
        'UPDATE messages SET message_text = ?, is_edited = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [message_text, id]
      );
      const [updated] = await connection.query('SELECT * FROM messages WHERE id = ?', [id]);
      res.json(updated[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to edit message', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/messages/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      connection = await getConnection();
      await connection.query(
        'UPDATE messages SET is_deleted = 1, message_text = "This message was deleted", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      res.json({ success: true, id: parseInt(id, 10) });
    } catch (error) {
      responseError(res, 500, 'Failed to delete message', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/messages/:id/reactions', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { emoji } = req.body;
      if (!emoji) return res.status(400).json({ error: 'emoji required' });

      connection = await getConnection();
      const [rows] = await connection.query('SELECT reactions FROM messages WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Message not found' });

      let currentReactions = {};
      try {
        currentReactions = typeof rows[0].reactions === 'string' ? JSON.parse(rows[0].reactions || '{}') : (rows[0].reactions || {});
      } catch (e) {
        currentReactions = {};
      }

      currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;

      await connection.query('UPDATE messages SET reactions = ? WHERE id = ?', [JSON.stringify(currentReactions), id]);
      res.json({ success: true, reactions: currentReactions });
    } catch (error) {
      responseError(res, 500, 'Failed to update reaction', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/messages/:userId', async (req, res) => {
    let connection;
    try {
      const { userId } = req.params;
      const { conversationWith, groupId } = req.query;

      connection = await getConnection();

      let query = `
        SELECT 
          m.*,
          u.first_name, u.last_name, u.avatar as sender_avatar,
          CASE 
            WHEN m.sender_id = ? THEN 'user'
            ELSE 'other'
          END as sender,
          m.message_text as text,
          DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
          DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') as timestamp
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE 1=1
      `;
      const params = [userId];

      if (groupId) {
        query += ' AND m.group_id = ?';
        params.push(groupId);
      } else if (conversationWith) {
        query += ' AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))';
        params.push(userId, conversationWith, conversationWith, userId);
      } else {
        return res.status(400).json({ error: 'conversationWith or groupId required' });
      }

      query += ' ORDER BY m.created_at ASC';

      const [messages] = await connection.query(query, params);
      res.json(messages);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch messages', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/available-users/:userId', async (req, res) => {
    let connection;
    try {
      const { userId } = req.params;
      const { search } = req.query;

      connection = await getConnection();

      let query = 'SELECT id, first_name, last_name, email, avatar, status, department FROM users WHERE id != ?';
      const params = [userId];

      if (search) {
        query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR department LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY first_name ASC LIMIT 100';

      const [users] = await connection.query(query, params);

      const formattedUsers = users.map(u => ({
        id: u.id,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        email: u.email,
        avatar: u.avatar,
        department: u.department || 'CRM',
        status: u.status || 'Active'
      }));

      res.json(formattedUsers);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch available users', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/users/:userId/heartbeat', async (req, res) => {
    let connection;
    try {
      const { userId } = req.params;
      connection = await getConnection();
      await connection.query('UPDATE users SET last_seen = CURRENT_TIMESTAMP, status = "Active" WHERE id = ?', [userId]);
      res.json({ success: true, timestamp: new Date() });
    } catch (error) {
      responseError(res, 500, 'Failed to update heartbeat', error);
    } finally {
      if (connection) connection.release();
    }
  });

};

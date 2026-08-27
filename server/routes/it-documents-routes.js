const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET all documents
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM it_documents ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching IT documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST a new document
router.post('/', async (req, res) => {
  try {
    const {
      title, project, category, folder, file_type, version, description,
      tags, file_url, upload_source, linked_email, notify_members,
      access_permission, allow_download, allow_print, add_to_starred,
      version_control, set_expiry_date, created_by
    } = req.body;

    const query = `
      INSERT INTO it_documents (
        title, project, category, folder, file_type, version, description,
        tags, file_url, upload_source, linked_email, notify_members,
        access_permission, allow_download, allow_print, add_to_starred,
        version_control, set_expiry_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      title, project, category, folder, file_type, version, description,
      JSON.stringify(tags || []), file_url, upload_source, linked_email, JSON.stringify(notify_members || []),
      access_permission, allow_download, allow_print, add_to_starred,
      version_control, set_expiry_date, created_by
    ];

    const [result] = await db.query(query, values);
    res.status(201).json({ id: result.insertId, message: 'Document uploaded successfully' });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// DELETE a document
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM it_documents WHERE id = ?', [id]);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;

const express = require('express');
const { Pool } = require('pg');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get all reports (admin: all reports; employee: own reports only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('User fetching reports:', { role: req.user.role, id: req.user.id });

    let query;
    let params = [];

    if (req.user.role === 'admin') {
      query = `
        SELECT r.*, u.name as employee_name, u.email as employee_email
        FROM reports r
        JOIN users u ON r.employee_id = u.id
        ORDER BY r.created_at DESC
      `;
    } else if (req.user.role === 'employee') {
      query = `
        SELECT r.*, u.name as employee_name, u.email as employee_email
        FROM reports r
        JOIN users u ON r.employee_id = u.id
        WHERE r.employee_id = $1
        ORDER BY r.created_at DESC
      `;
      params = [req.user.id];
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Create a new report (employee only)
router.post('/', authenticateToken, requireRole(['employee']), async (req, res) => {
  try {
    console.log('User creating report:', { role: req.user.role, id: req.user.id });
    console.log('Request body:', req.body);
    console.log('employee_id:', req.user.id, 'Type:', typeof req.user.id);
    console.log('related_id:', req.body.related_id, 'Type:', typeof req.body.related_id);

    const { report_type, priority, related_id, subject, description, suggested_action } = req.body;

    if (!report_type || !priority || !subject || !description) {
      return res.status(400).json({ error: 'report_type, priority, subject, and description are required' });
    }

    await pool.query('BEGIN');

    // Préparer les paramètres pour l'INSERT
    const params = [
      req.user.id, // $1: employee_id (UUID)
      report_type, // $2: report_type (VARCHAR)
      priority, // $3: priority (VARCHAR)
      related_id || null, // $4: related_id (VARCHAR, peut être null)
      subject, // $5: subject (TEXT)
      description, // $6: description (TEXT)
      suggested_action || null // $7: suggested_action (TEXT, peut être null)
    ];
    console.log('INSERT params:', params);

    const result = await pool.query(`
      INSERT INTO reports (employee_id, report_type, priority, related_id, subject, description, suggested_action)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, params);

    if (related_id) {
      const updateResult = await pool.query(
        `UPDATE service_requests 
         SET reported = TRUE, 
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 
         RETURNING id, reported`,
        [related_id]
      );
      if (updateResult.rowCount === 0) {
        console.warn(`No service found with id ${related_id}`);
      } else {
        console.log('Service updated as reported:', updateResult.rows);
      }
    }

    await pool.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating report:', error);
    console.error('Error code:', error.code);
    console.error('Error details:', error.message);

    if (error.code === '22P02') { // Invalid UUID syntax
      res.status(400).json({ 
        error: 'Invalid UUID format in database operation.',
        details: `Check employee_id: ${req.user.id} (type: ${typeof req.user.id}) or other UUID fields.`
      });
    } else if (error.code === '42703') { // Column does not exist
      res.status(500).json({ error: 'Database configuration error: column missing' });
    } else {
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }
});

module.exports = router;
const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications :', error);
    res.status(500).json({ error: 'Échec de la récupération des notifications', details: error.message });
  }
});

// POST create notification (system/admin only)
router.post('/', [
  authenticateToken,
  requireRole(['admin']),
  body('user_id').isUUID().withMessage('ID utilisateur invalide'),
  body('title').trim().isLength({ min: 3 }).withMessage('Le titre doit contenir au moins 3 caractères'),
  body('message').trim().isLength({ min: 10 }).withMessage('Le message doit contenir au moins 10 caractères'),
  body('type').isIn(['payment', 'ticket', 'service', 'system', 'subscription', 'registration', 'report', 'complaint', 'rating']).withMessage('Type de notification invalide'),
  body('related_id').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { user_id, title, message, type, related_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_id, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING *`,
      [user_id, title, message, type, related_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la création de la notification :', error);
    res.status(500).json({ error: 'Échec de la création de la notification', details: error.message });
  }
});

// PUT mark notification as read
router.put('/:notificationId/read', authenticateToken, async (req, res) => {
  const { notificationId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [notificationId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors du marquage de la notification comme lue :', error);
    res.status(500).json({ error: 'Échec de la mise à jour de la notification', details: error.message });
  }
});

// PUT mark all notifications as read
// PUT mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE user_id = $1 AND is_read = false 
       RETURNING id`, // Remplacer count(*) par une colonne valide, comme id
      [req.user.id]
    );

    res.json({ 
      message: 'Toutes les notifications ont été marquées comme lues', 
      count: result.rowCount // Utiliser rowCount pour le nombre de lignes affectées
    });
  } catch (error) {
    console.error('Erreur lors du marquage de toutes les notifications comme lues :', error);
    res.status(500).json({ error: 'Échec de la mise à jour des notifications', details: error.message });
  }
});  
// GET unread notification count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre de notifications non lues :', error);
    res.status(500).json({ error: 'Échec de la récupération du nombre de notifications non lues', details: error.message });
  }
});

// DELETE notification
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  const { notificationId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [notificationId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    res.json({ message: 'Notification supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la notification :', error);
    res.status(500).json({ error: 'Échec de la suppression de la notification', details: error.message });
  }
});

// GET all admins (for sending notifications)
router.get('/admins', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users WHERE role = $1', ['admin']);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des administrateurs :', error);
    res.status(500).json({ error: 'Échec de la récupération des administrateurs', details: error.message });
  }
});

module.exports = router;
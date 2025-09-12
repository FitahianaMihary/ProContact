const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const checkSubscription = require('../middleware/checkSubscription');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'customer') {
      query = `
        SELECT sr.*, u.name as customer_name, u.email as customer_email, u.phone, u.address, a.name as assigned_to_name,
               COALESCE(ur.rating, 0) as rating
        FROM service_requests sr
        LEFT JOIN users u ON sr.customer_id = u.id
        LEFT JOIN users a ON sr.assigned_to = a.id
        LEFT JOIN user_ratings ur ON sr.id = ur.service_id AND ur.entity_type = 'service_request' AND ur.user_id = $1
        WHERE sr.customer_id = $2
        ORDER BY sr.created_at DESC
      `;
      params = [req.user.id, req.user.id];
    } else {
      query = `
        SELECT sr.*, u.name as customer_name, u.email as customer_email, u.phone, u.address, a.name as assigned_to_name,
               COALESCE(ur.rating, 0) as rating
        FROM service_requests sr
        LEFT JOIN users u ON sr.customer_id = u.id
        LEFT JOIN users a ON sr.assigned_to = a.id
        LEFT JOIN user_ratings ur ON sr.id = ur.service_id AND ur.entity_type = 'service_request'
        ORDER BY sr.created_at DESC
      `;
    }

    const result = await pool.query(query, params);
    console.log(`Récupération des services pour ${req.user.role} (${req.user.id}): ${result.rows.length} lignes`);
    if (result.rows.length === 0) {
      return res.status(200).json([]);
    }

    const enrichedRows = await Promise.all(result.rows.map(async (row) => {
      if (!row.customer_name || !row.phone || !row.address) {
        const user = await pool.query('SELECT name, email, phone, address FROM users WHERE id = $1', [row.customer_id]);
        if (user.rows[0]) {
          row.customer_name = row.customer_name || user.rows[0].name;
          row.customer_email = row.customer_email || user.rows[0].email;
          row.phone = row.phone || user.rows[0].phone;
          row.address = row.address || user.rows[0].address;
        }
      }

      // Structurer l'objet customer comme attendu par le frontend
      return {
        ...row,
        customer: {
          name: row.customer_name || 'Inconnu',
          email: row.customer_email || '',
          phone: row.phone || 'N/A',
          address: row.address || 'N/A',
        },
        assigned_to_name: row.assigned_to_name || 'Non assigné', // Nom de l'employé assigné
        scheduled_date: row.scheduled_date ? row.scheduled_date.toISOString() : null, // Format ISO pour la date
      };
    }));

    res.json(enrichedRows);
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes de service :', error);
    res.status(500).json({ error: 'Échec de la récupération des demandes de service', details: error.message });
  }
});

router.post('/', [
  authenticateToken,
  checkSubscription('home-service-per-use', 'home-service-monthly', 'premium-monitoring'),
  body('service').trim().isLength({ min: 3 }).withMessage('Le nom du service doit contenir au moins 3 caractères'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('La description ne doit pas dépasser 500 caractères'),
  body('scheduled_date').isISO8601().withMessage('Format de date invalide, utilisez ISO 8601 (ex. : 2025-07-19T14:00:00Z)'),
  body('scheduled_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('L’heure doit être au format HH:mm')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { service, description, scheduled_date, scheduled_time } = req.body;

  try {
    const userCheck = await pool.query('SELECT name, email, phone, address FROM users WHERE id = $1', [req.user.id]);
    if (!userCheck.rows[0] || !userCheck.rows[0].name || !userCheck.rows[0].phone || !userCheck.rows[0].address) {
      return res.status(400).json({ error: 'Les informations du client sont incomplètes' });
    }

    // Vérifier l'abonnement actif
    const { rows } = await pool.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = $1 AND is_active = true 
       AND (service_id IN ('home-service-per-use', 'home-service-monthly', 'premium-monitoring') 
            OR is_global = true)`,
      [req.user.id]
    );

    const subscription = rows.find(
      (sub) =>
        (sub.service_id === 'home-service-per-use' ||
         sub.service_id === 'home-service-monthly' ||
         sub.service_id === 'premium-monitoring' ||
         sub.is_global) &&
        sub.is_active &&
        (sub.expires_at ? new Date(sub.expires_at) > new Date() : true) &&
        (sub.subscription_type === 'per-use' ? sub.remaining_credits > 0 : true)
    );

    if (!subscription) {
      return res.status(403).json({ error: 'Aucun abonnement actif ou crédits épuisés.' });
    }

    // Consommer un crédit si abonnement per-use (et non premium)
    if (subscription.subscription_type === 'per-use' && subscription.service_id !== 'premium-monitoring') {
      await pool.query(
        `UPDATE subscriptions 
         SET remaining_credits = remaining_credits - 1, updated_at = NOW() 
         WHERE id = $1`,
        [subscription.id]
      );
    }

    // Créer la demande de service
    const result = await pool.query(
      `INSERT INTO service_requests (customer_id, service, description, scheduled_date, scheduled_time, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
       RETURNING *`,
      [req.user.id, service, description || null, scheduled_date, scheduled_time || null]
    );

    const serviceRequest = result.rows[0];

    // Créer une notification pour les admins et employés
    const client = userCheck.rows[0];
    const staff = await pool.query('SELECT id FROM users WHERE role IN ($1, $2)', ['admin', 'employee']);
    for (const member of staff.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          member.id,
          'Nouvelle demande de service',
          `Le client ${client.name} (${client.email}) a soumis une demande de service #SRV-${String(serviceRequest.id).padStart(3, '0')} pour ${service}.`,
          'service',
          serviceRequest.id
        ]
      );
    }

    res.status(201).json(serviceRequest);
  } catch (error) {
    console.error('Erreur lors de la création de la demande de service :', error);
    res.status(500).json({ error: 'Échec de la création de la demande de service', details: error.message });
  }
});

router.put('/:serviceId', [
  authenticateToken,
  requireRole(['admin', 'employee']),
  body('status').optional().isIn(['pending', 'scheduled', 'in-progress', 'completed', 'cancelled']).withMessage('Statut invalide'),
  body('assigned_to').optional().isUUID().withMessage('ID d’assignation invalide')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { serviceId } = req.params;
  const { status, assigned_to } = req.body;

  try {
    const result = await pool.query(
      `UPDATE service_requests 
       SET status = COALESCE($1, status),
           assigned_to = COALESCE($2, assigned_to),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 
       RETURNING *`,
      [status, assigned_to, serviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demande de service non trouvée' });
    }

    const serviceRequest = result.rows[0];

    // Créer une notification pour le client si le statut est mis à jour
    if (status) {
      const user = await pool.query('SELECT name, email FROM users WHERE id = $1', [serviceRequest.customer_id]);
      const client = user.rows[0];
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          serviceRequest.customer_id,
          'Mise à jour de la demande de service',
          `Votre demande de service #SRV-${String(serviceRequest.id).padStart(3, '0')} pour ${serviceRequest.service} est maintenant ${status}.`,
          'service',
          serviceRequest.id
        ]
      );
    }

    res.json(serviceRequest);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la demande de service :', error);
    res.status(500).json({ error: 'Échec de la mise à jour de la demande de service', details: error.message });
  }
});

router.get('/:serviceId', authenticateToken, async (req, res) => {
  const { serviceId } = req.params;

  try {
    let query = `
      SELECT sr.*, u.name as customer_name, u.phone, u.address, a.name as assigned_name
      FROM service_requests sr
      LEFT JOIN users u ON sr.customer_id = u.id
      LEFT JOIN users a ON sr.assigned_to = a.id
      WHERE sr.id = $1
    `;
    let params = [serviceId];

    if (req.user.role === 'customer') {
      query += ' AND sr.customer_id = $2';
      params.push(req.user.id);
    }

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demande de service non trouvée' });
    }

    const row = result.rows[0];
    if (!row.customer_name || !row.phone || !row.address) {
      const user = await pool.query('SELECT name, phone, address FROM users WHERE id = $1', [row.customer_id]);
      if (user.rows[0]) {
        row.customer_name = row.customer_name || user.rows[0].name;
        row.phone = row.phone || user.rows[0].phone;
        row.address = row.address || user.rows[0].address;
      }
    }

    res.json(row);
  } catch (error) {
    console.error('Erreur lors de la récupération de la demande de service :', error);
    res.status(500).json({ error: 'Échec de la récupération de la demande de service', details: error.message });
  }
});

router.post('/ratings/:serviceId', [
  authenticateToken,
  requireRole(['customer']),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),
  body('feedback').optional().trim().isLength({ max: 500 }).withMessage('Le feedback ne doit pas dépasser 500 caractères')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { serviceId } = req.params;
  const { rating, feedback } = req.body;

  try {
    const serviceCheck = await pool.query(
      'SELECT status, service, assigned_to FROM service_requests WHERE id = $1 AND customer_id = $2',
      [serviceId, req.user.id]
    );
    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Demande de service non trouvée ou non autorisée' });
    }
    if (serviceCheck.rows[0].status !== 'completed') {
      return res.status(400).json({ error: 'La demande de service doit être complétée pour être notée' });
    }
    const assignedTo = serviceCheck.rows[0].assigned_to;
    if (!assignedTo) {
      return res.status(400).json({ error: 'Aucun employé assigné à cette demande de service' });
    }

    await pool.query(
      'INSERT INTO user_ratings (user_id, service_id, entity_type, rating, feedback, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
      [req.user.id, serviceId, 'service_request', rating, feedback]
    );

    await pool.query(
      'UPDATE service_requests SET rated = true WHERE id = $1',
      [serviceId]
    );

    // Créer une notification pour les admins
    const user = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const client = user.rows[0];
    const admins = await pool.query('SELECT id FROM users WHERE role = $1', ['admin']);
    for (const admin of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          admin.id,
          'Nouvelle évaluation de service',
          `Le client ${client.name} (${client.email}) a donné une note de ${rating}/5 à la demande de service #SRV-${String(serviceId).padStart(3, '0')} pour ${serviceCheck.rows[0].service}.`,
          'rating',
          serviceId
        ]
      );
    }

    res.status(201).json({ message: 'Évaluation soumise avec succès' });
  } catch (error) {
    console.error('Erreur lors de la soumission de l’évaluation :', error);
    res.status(500).json({ error: 'Échec de la soumission de l’évaluation', details: error.message });
  }
});

module.exports = router; 
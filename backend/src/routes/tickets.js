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
        SELECT t.*, 
               u.name as customer_name, 
               u.email as customer_email,
               u.phone as customer_phone,
               u.address as customer_address,
               u.age as customer_age,
               u.gender as customer_gender,
               u.profile_picture as customer_profile_picture,
               a.name as assigned_name,
               LPAD(t.ticket_number::text, 3, '0') AS formatted_ticket_id,
               COALESCE(t.rated, false) as rated
        FROM tickets t
        LEFT JOIN users u ON t.customer_id = u.id
        LEFT JOIN users a ON t.assigned_to = a.id
        WHERE t.customer_id = $1 AND t.is_archived = FALSE
        ORDER BY t.created_at DESC
      `;
      params = [req.user.id];
    } else {
      query = `
        SELECT t.*, 
               u.name as customer_name, 
               u.email as customer_email,
               u.phone as customer_phone,
               u.address as customer_address,
               u.age as customer_age,
               u.gender as customer_gender,
               u.profile_picture as customer_profile_picture,
               a.name as assigned_name,
               LPAD(t.ticket_number::text, 3, '0') AS formatted_ticket_id,
               COALESCE(t.rated, false) as rated
        FROM tickets t
        LEFT JOIN users u ON t.customer_id = u.id
        LEFT JOIN users a ON t.assigned_to = a.id
        WHERE t.is_archived = FALSE
        ORDER BY t.created_at DESC
      `;
    }

    const result = await pool.query(query, params);
    console.log(`Récupération des tickets pour ${req.user.role} (${req.user.id}): ${result.rows.length} lignes`);
    if (result.rows.length === 0) {
      return res.status(200).json([]);
    }
    const tickets = result.rows.map(ticket => ({
      ...ticket,
      display_id: `TICKET-${ticket.formatted_ticket_id}`,
      customer: {
        name: ticket.customer_name,
        email: ticket.customer_email,
        phone: ticket.customer_phone,
        address: ticket.customer_address,
        age: ticket.customer_age,
        gender: ticket.gender,
        profile_picture: ticket.profile_picture,
      },
    }));
    res.json(tickets);
  } catch (error) {
    console.error('Erreur lors de la récupération des tickets :', error);
    res.status(500).json({ error: 'Échec de la récupération des tickets' });
  }
});

// Nouvelle route pour les tickets archivés
router.get('/archived', authenticateToken, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'customer') {
      query = `
        SELECT t.*, 
               u.name as customer_name, 
               u.email as customer_email,
               u.phone as customer_phone,
               u.address as customer_address,
               u.age as customer_age,
               u.gender as customer_gender,
               u.profile_picture as customer_profile_picture,
               a.name as assigned_name,
               LPAD(t.ticket_number::text, 3, '0') AS formatted_ticket_id,
               COALESCE(t.rated, false) as rated
        FROM tickets t
        LEFT JOIN users u ON t.customer_id = u.id
        LEFT JOIN users a ON t.assigned_to = a.id
        WHERE t.customer_id = $1 AND t.is_archived = TRUE
        ORDER BY t.created_at DESC
      `;
      params = [req.user.id];
    } else {
      query = `
        SELECT t.*, 
               u.name as customer_name, 
               u.email as customer_email,
               u.phone as customer_phone,
               u.address as customer_address,
               u.age as customer_age,
               u.gender as customer_gender,
               u.profile_picture as customer_profile_picture,
               a.name as assigned_name,
               LPAD(t.ticket_number::text, 3, '0') AS formatted_ticket_id,
               COALESCE(t.rated, false) as rated
        FROM tickets t
        LEFT JOIN users u ON t.customer_id = u.id
        LEFT JOIN users a ON t.assigned_to = a.id
        WHERE t.is_archived = TRUE
        ORDER BY t.created_at DESC
      `;
    }

    const result = await pool.query(query, params);
    console.log(`Récupération des tickets archivés pour ${req.user.role} (${req.user.id}): ${result.rows.length} lignes`);
    if (result.rows.length === 0) {
      return res.status(200).json([]);
    }
    const tickets = result.rows.map(ticket => ({
      ...ticket,
      display_id: `TICKET-${ticket.formatted_ticket_id}`,
      customer: {
        name: ticket.customer_name,
        email: ticket.customer_email,
        phone: ticket.customer_phone,
        address: ticket.customer_address,
        age: ticket.customer_age,
        gender: ticket.gender,
        profile_picture: ticket.profile_picture,
      },
    }));
    res.json(tickets);
  } catch (error) {
    console.error('Erreur lors de la récupération des tickets archivés :', error);
    res.status(500).json({ error: 'Échec de la récupération des tickets archivés' });
  }
});

router.post('/', [
  authenticateToken,
  checkSubscription('ticketing-per-use', 'ticketing-monthly', 'premium-monitoring'),
  body('title').trim().isLength({ min: 3 }),
  body('description').trim().isLength({ min: 10 }),
  body('category').optional().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, category = 'general', priority = 'medium' } = req.body;

  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Utilisateur non authentifié' });
  }

  try {
    // Vérifier l'abonnement actif
    const { rows } = await pool.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = $1 AND is_active = true 
       AND (service_id IN ('ticketing-per-use', 'ticketing-monthly', 'premium-monitoring') 
            OR is_global = true)`,
      [req.user.id]
    );

    const subscription = rows.find(
      (sub) =>
        (sub.service_id === 'ticketing-per-use' ||
         sub.service_id === 'ticketing-monthly' ||
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
    let updatedSubscription;
    if (subscription.subscription_type === 'per-use' && subscription.service_id !== 'premium-monitoring') {
      const updateResult = await pool.query(
        `UPDATE subscriptions 
         SET remaining_credits = remaining_credits - 1, updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [subscription.id]
      );
      updatedSubscription = updateResult.rows[0];
      // Désactiver l'abonnement si plus de crédits
      if (updatedSubscription.remaining_credits <= 0) {
        await pool.query(
          `UPDATE subscriptions 
           SET is_active = false 
           WHERE id = $1`,
          [subscription.id]
        );
        updatedSubscription.is_active = false;
      }
    }

    // Créer le ticket sans spécifier le statut (utilise la valeur par défaut 'pending' de la base)
    const result = await pool.query(
      `INSERT INTO tickets (customer_id, title, description, category, priority, rated, is_archived) 
       VALUES ($1, $2, $3, $4, $5, false, false) 
       RETURNING *, LPAD(ticket_number::text, 3, '0') AS formatted_ticket_id`,
      [req.user.id, title, description, category, priority]
    );

    const ticket = result.rows[0];
    ticket.display_id = `TICKET-${ticket.formatted_ticket_id}`;

    // Créer une notification pour les admins et employés
    const user = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const client = user.rows[0];
    const staff = await pool.query('SELECT id FROM users WHERE role IN ($1, $2)', ['admin', 'employee']);
    for (const member of staff.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          member.id,
          'Nouveau ticket créé',
          `Le client ${client.name} (${client.email}) a créé le ticket #${ticket.display_id} : ${title}.`,
          'ticket',
          ticket.id
        ]
      );
    }

    res.status(201).json({ ticket, subscription: updatedSubscription || subscription });
  } catch (error) {
    console.error('Erreur lors de la création du ticket :', error);
    res.status(500).json({ error: 'Échec de la création du ticket', details: error.message });
  }
});

router.get('/:ticketId', authenticateToken, async (req, res) => {
  const { ticketId } = req.params;

  try {
    let query = `
      SELECT 
        t.*, 
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        u.address as customer_address,
        u.age as customer_age,
        u.gender as customer_gender,
        u.profile_picture as customer_profile_picture,
        a.name as assigned_name,
        LPAD(t.ticket_number::text, 3, '0') AS formatted_ticket_id,
        COALESCE(t.rated, false) as rated
      FROM tickets t
      LEFT JOIN users u ON t.customer_id = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      WHERE t.id = $1 AND t.is_archived = FALSE
    `;
    let params = [ticketId];

    if (req.user.role === 'customer') {
      query += ' AND t.customer_id = $2';
      params.push(req.user.id);
    }

    const ticketResult = await pool.query(query, params);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket non trouvé ou archivé' });
    }

    const ticket = ticketResult.rows[0];
    ticket.display_id = `TICKET-${ticket.formatted_ticket_id}`;

    const messagesResult = await pool.query(
      `SELECT tm.*, u.name as sender_name
       FROM ticket_messages tm
       LEFT JOIN users u ON tm.sender_id = u.id
       WHERE tm.ticket_id = $1
       ORDER BY tm.created_at ASC`,
      [ticketId]
    );

    ticket.messages = messagesResult.rows;

    res.json(ticket);
  } catch (error) {
    console.error('Erreur lors de la récupération du ticket :', error);
    res.status(500).json({ error: 'Échec de la récupération du ticket' });
  }
});

router.put('/:ticketId', [
  authenticateToken,
  requireRole(['admin', 'employee']),
  body('status').optional().isIn(['open', 'assigned', 'in-progress', 'resolved', 'closed', 'transferred']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('assigned_to').optional().isUUID()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { ticketId } = req.params;
  const { status, priority, assigned_to } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tickets 
       SET status = COALESCE($1, status),
           priority = COALESCE($2, priority),
           assigned_to = COALESCE($3, assigned_to),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND is_archived = FALSE
       RETURNING *, LPAD(ticket_number::text, 3, '0') AS formatted_ticket_id`,
      [status, priority, assigned_to, ticketId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket non trouvé ou archivé' });
    }

    const ticket = result.rows[0];
    ticket.display_id = `TICKET-${ticket.formatted_ticket_id}`;
    res.json(ticket);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du ticket :', error);
    res.status(500).json({ error: 'Échec de la mise à jour du ticket' });
  }
});

router.get('/:ticketId/messages', authenticateToken, async (req, res) => {
  const { ticketId } = req.params;

  try {
    const ticketQuery = req.user.role === 'customer'
      ? `SELECT * FROM tickets WHERE id = $1 AND customer_id = $2 AND is_archived = FALSE`
      : `SELECT * FROM tickets WHERE id = $1 AND is_archived = FALSE`;

    const ticketParams = req.user.role === 'customer'
      ? [ticketId, req.user.id]
      : [ticketId];

    const ticketCheck = await pool.query(ticketQuery, ticketParams);
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket non trouvé ou accès refusé' });
    }

    const result = await pool.query(
      `SELECT tm.*, u.name as sender_name
       FROM ticket_messages tm
       LEFT JOIN users u ON tm.sender_id = u.id
       WHERE tm.ticket_id = $1
       ORDER BY tm.created_at ASC`,
      [ticketId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages du ticket :', error);
    res.status(500).json({ error: 'Échec de la récupération des messages du ticket' });
  }
});

router.post('/:ticketId/messages', [
  authenticateToken,
  body('message').trim().isLength({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { ticketId } = req.params;
  const { message } = req.body;

  try {
    let accessQuery = 'SELECT * FROM tickets WHERE id = $1 AND is_archived = FALSE';
    let accessParams = [ticketId];

    if (req.user.role === 'customer') {
      accessQuery += ' AND customer_id = $2';
      accessParams.push(req.user.id);
    }

    const accessResult = await pool.query(accessQuery, accessParams);
    if (accessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket non trouvé' });
    }

    const ticket = accessResult.rows[0];
    if (ticket.status === 'resolved') {
      return res.status(403).json({ error: 'Ce ticket est résolu. Veuillez créer un nouveau ticket pour continuer.' });
    }

    const result = await pool.query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, message, sender_type) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [ticketId, req.user.id, message, req.user.role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de l\'ajout du message au ticket :', error);
    res.status(500).json({ error: 'Échec de l\'ajout du message au ticket' });
  }
});

router.post('/ratings/:ticketId', authenticateToken, [
  body('rating').isInt({ min: 1, max: 5 }),
  body('feedback').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { ticketId } = req.params;
  const { rating, feedback } = req.body;

  try {
    const ticketCheck = await pool.query(
      `SELECT customer_id FROM tickets WHERE id = $1 AND status = 'resolved' AND customer_id = $2 AND is_archived = FALSE`,
      [ticketId, req.user.id]
    );

    if (ticketCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à noter ce ticket' });
    }

    await pool.query(
      `INSERT INTO user_ratings (user_id, service_id, entity_type, rating, feedback, created_at) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [req.user.id, ticketId, 'ticket', rating, feedback]
    );

    await pool.query(
      `UPDATE tickets 
       SET rated = true, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [ticketId]
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
          'Nouvelle évaluation de ticket',
          `Le client ${client.name} (${client.email}) a donné une note de ${rating}/5 au ticket #TICKET-${String(ticketCheck.rows[0].ticket_number).padStart(3, '0')}.`,
          'rating',
          ticketId
        ]
      );
    }

    res.status(200).json({ message: 'Évaluation soumise avec succès' });
  } catch (error) {
    console.error('Erreur lors de la soumission de l\'évaluation du ticket :', error.stack);
    res.status(500).json({ error: 'Échec de la soumission de l\'évaluation', details: error.message });
  }
});

// Nouveaux endpoints pour l'archivage
router.post('/archive/:ticketId', authenticateToken, async (req, res) => {
  const { ticketId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE tickets 
       SET is_archived = TRUE, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_archived = FALSE
       RETURNING *, LPAD(ticket_number::text, 3, '0') AS formatted_ticket_id`,
      [ticketId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket non trouvé ou déjà archivé' });
    }

    const ticket = result.rows[0];
    ticket.display_id = `TICKET-${ticket.formatted_ticket_id}`;
    res.json({ message: 'Ticket archivé avec succès', ticket });
  } catch (error) {
    console.error('Erreur lors de l\'archivage du ticket :', error);
    res.status(500).json({ error: 'Échec de l\'archivage du ticket' });
  }
});

router.post('/unarchive/:ticketId', authenticateToken, async (req, res) => {
  const { ticketId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE tickets 
       SET is_archived = FALSE, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_archived = TRUE
       RETURNING *, LPAD(ticket_number::text, 3, '0') AS formatted_ticket_id`,
      [ticketId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket non trouvé ou non archivé' });
    }

    const ticket = result.rows[0];
    ticket.display_id = `TICKET-${ticket.formatted_ticket_id}`;
    res.json({ message: 'Ticket restauré avec succès', ticket });
  } catch (error) {
    console.error('Erreur lors de la restauration du ticket :', error);
    res.status(500).json({ error: 'Échec de la restauration du ticket' });
  }
});

module.exports = router;
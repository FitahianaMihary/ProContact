const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        id, service_id, subscription_type, remaining_credits, expires_at, is_active, is_global, amount, created_at, updated_at
      FROM subscriptions
      WHERE user_id = $1
    `;

    const { rows } = await pool.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const {
    service_id,
    subscription_type,
    remaining_credits,
    is_global = false,
    amount
  } = req.body;

  if (!subscription_type || (!is_global && !service_id)) {
    return res.status(400).json({
      error: 'subscription_type et service_id (ou is_global) sont requis'
    });
  }

  if (!amount && amount !== 0) {
    return res.status(400).json({
      error: 'Le champ amount est requis.'
    });
  }

  try {
    if (is_global) {
      await pool.query(
        `UPDATE subscriptions 
         SET is_active = false 
         WHERE user_id = $1 AND is_global = true AND is_active = true`,
        [userId]
      );
    } else {
      await pool.query(
        `UPDATE subscriptions 
         SET is_active = false 
         WHERE user_id = $1 AND service_id = $2 AND is_active = true`,
        [userId, service_id]
      );
    }

    let subscription;
    if (subscription_type === 'monthly') {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const insertQuery = `
        INSERT INTO subscriptions (
          user_id, service_id, subscription_type, expires_at, amount, is_active, is_global, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())
        RETURNING *
      `;

      const insertRes = await pool.query(insertQuery, [
        userId,
        service_id || null,
        subscription_type,
        expiresAt,
        amount,
        is_global
      ]);
      subscription = insertRes.rows[0];
    } else if (subscription_type === 'per-use') {
      const credits = remaining_credits || 0;

      const insertQuery = `
        INSERT INTO subscriptions (
          user_id, service_id, subscription_type, remaining_credits, amount, is_active, is_global, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())
        RETURNING *
      `;

      const insertRes = await pool.query(insertQuery, [
        userId,
        service_id || null,
        subscription_type,
        credits,
        amount,
        is_global
      ]);
      subscription = insertRes.rows[0];
    } else {
      return res.status(400).json({ error: 'Invalid subscription_type' });
    }

    // Create notification for admins
    const user = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
    const client = user.rows[0];
    const admins = await pool.query('SELECT id FROM users WHERE role = $1', ['admin']);
    for (const admin of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          admin.id,
          'Nouvel abonnement client',
          `Le client ${client.name} (${client.email}) a souscrit à un abonnement ${subscription_type} le ${new Date().toLocaleDateString('fr-FR')}.`,
          'subscription',
          subscription.id
        ]
      );
    }

    return res.json(subscription);
  } catch (error) {
    console.error('Error creating/updating subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:subscriptionKey/consume-credit', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { subscriptionKey } = req.params;

  try {
    const query = `
      SELECT * FROM subscriptions
      WHERE user_id = $1 
        AND (service_id = $2 OR is_global = true)
        AND subscription_type = 'per-use'
        AND is_active = true
        AND remaining_credits > 0
      LIMIT 1
    `;

    const { rows } = await pool.query(query, [userId, subscriptionKey]);

    if (rows.length === 0) {
      return res.status(400).json({ error: "Aucune souscription 'per-use' active avec crédit suffisant." });
    }

    const subscription = rows[0];

    await pool.query(
      `UPDATE subscriptions 
       SET remaining_credits = remaining_credits - 1, updated_at = NOW() 
       WHERE id = $1`,
      [subscription.id]
    );

    res.status(200).json({ success: true, message: 'Crédit consommé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la consommation du crédit:', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

module.exports = router;
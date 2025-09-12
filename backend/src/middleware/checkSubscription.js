const pool = require('../config/database');

/**
 * Middleware pour vérifier si un utilisateur est abonné à un ou plusieurs services donnés,
 * ou s’il dispose d’un abonnement premium/global.
 * Exemple d’usage : checkSubscription('ticketing-per-use', 'ticketing-monthly')
 */
function checkSubscription(...serviceKeys) {
  return async (req, res, next) => {
    const userId = req.user.id;
    console.log("User ID:", userId);
    console.log("Service keys:", serviceKeys);

    try {
      const { rows } = await pool.query(
        `SELECT * FROM subscriptions 
         WHERE user_id = $1 AND is_active = true`,
        [userId]
      );

      if (rows.length === 0) {
        console.log("No active subscriptions found for user.");
        return res.status(403).json({
          error: "Vous n'avez pas d'abonnement actif pour ce service.",
        });
      }

      const now = new Date();
      const hasPremium = rows.some((sub) =>
        (sub.service_id === "premium" || sub.service_id === "premium-monitoring") &&
        sub.is_active &&
        (sub.expires_at ? new Date(sub.expires_at) > now : true)
      );

      if (hasPremium) {
        console.log("Premium subscription detected, unlocking all services.");
        return next();
      }

      const validSubscription = rows.find((sub) =>
        (serviceKeys.includes(sub.service_id) || sub.service_id.startsWith(serviceKeys[0] + "-")) &&
        sub.is_active &&
        (sub.expires_at ? new Date(sub.expires_at) > now : true) &&
        (sub.subscription_type === "monthly" ||
          (sub.subscription_type === "per-use" && sub.remaining_credits && sub.remaining_credits > 0))
      );

      if (!validSubscription) {
        console.log("No valid subscription conditions met.");
        return res.status(403).json({
          error: "Aucun abonnement actif ou crédits épuisés.",
        });
      }

      console.log("Subscription validated:", validSubscription);
      return next();
    } catch (error) {
      console.error('Erreur de vérification d’abonnement :', error);
      return res.status(500).json({
        error: "Erreur serveur lors de la vérification d'abonnement.",
      });
    }
  };
}

module.exports = checkSubscription;
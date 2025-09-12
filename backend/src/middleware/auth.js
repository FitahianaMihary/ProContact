const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('Aucun token trouvé dans l\'en-tête Authorization');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token décodé avec succès pour userId:', decoded.userId);

    // Get user from database to ensure they still exist
    const result = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      console.log('Utilisateur non trouvé dans la base de données pour userId:', decoded.userId);
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Erreur de vérification du token :', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      console.log(`Rôle insuffisant : ${req.user.role} n'est pas dans ${roles}`);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Nouvelle fonction pour permettre aux employés d'accéder aux données des clients
const requireEmployeeAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { userId } = req.params;
  if (req.user.role === 'admin' || (req.user.role === 'employee' && userId)) {
    // Permettre aux employés d'accéder aux informations des clients
    try {
      const result = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );
      if (result.rows.length === 0) {
        console.log('Utilisateur non trouvé pour userId:', userId);
        return res.status(404).json({ error: 'User not found' });
      }
      if (result.rows[0].role === 'customer') {
        next();
      } else {
        console.log('Rôle non autorisé pour userId:', userId);
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du rôle :', error.message);
      return res.status(500).json({ error: 'Failed to check user role' });
    }
  } else {
    console.log('Permissions insuffisantes pour userId:', req.user.id);
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireEmployeeAccess
};
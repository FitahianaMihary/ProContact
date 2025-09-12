const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/database");
const { authenticateToken, requireRole, requireEmployeeAccess } = require("../middleware/auth");

const router = express.Router();

// GET ALL USERS (admin only)
router.get("/", authenticateToken, requireRole(["admin"]), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, name, phone, address, role, status, age, gender, profile_picture, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ✅ GET ONLY CUSTOMERS
router.get("/clients", authenticateToken, requireRole(["admin", "employee"]), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, name, phone, address, role, status, created_at 
      FROM users 
      WHERE role = 'customer'
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// ✅ GET ONLY EMPLOYEES
router.get("/employees", authenticateToken, requireRole(["admin", "employee"]), async (req, res) => {
  try {
    console.log("Fetching employees for user role:", req.user.role);
    const result = await pool.query(`
      SELECT id, email, name, age, gender, status, profile_picture, created_at 
      FROM users 
      WHERE role = 'employee'
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// GET SINGLE USER BY ID
router.get("/:userId", authenticateToken, requireEmployeeAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `
      SELECT id, email, name, phone, address, role, status, age, gender, profile_picture, created_at, updated_at 
      FROM users 
      WHERE id = $1
      `,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// GET PROFILE OF LOGGED-IN USER
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, name, phone, address, role, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// UPDATE PROFILE
router.put("/profile", [
  authenticateToken,
  body("name").optional().trim().isLength({ min: 2 }),
  body("phone").optional().trim(),
  body("address").optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, phone, address } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           phone = COALESCE($2, phone), 
           address = COALESCE($3, address), 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 
       RETURNING id, email, name, phone, address, role`,
      [name, phone, address, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// UPDATE USER ROLE
router.put("/:userId/role", [
  authenticateToken,
  requireRole(["admin"]),
  body("role").isIn(["admin", "employee", "customer"]),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId } = req.params;
  const { role } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 
       RETURNING id, email, name, role`,
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// PATCH USER INFO
router.patch("/:userId", authenticateToken, requireRole(["admin"]), async (req, res) => {
  const { userId } = req.params;
  const { name, phone, address, age, gender, profile_picture, status } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE users SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        address = COALESCE($3, address),
        age = COALESCE($4, age),
        gender = COALESCE($5, gender),
        profile_picture = COALESCE($6, profile_picture),
        status = COALESCE($7, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING id, name, email, role, status
      `,
      [name, phone, address, age, gender, profile_picture, status, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE USER
router.delete("/:userId", authenticateToken, requireRole(["admin"]), async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ✅ GET TICKETS FOR A USER
router.get("/:userId/tickets", authenticateToken, requireEmployeeAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `
      SELECT id, customer_id, title, status, created_at
      FROM tickets 
      WHERE customer_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );
    res.json(result.rows); // même si vide, on renvoie []
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// ✅ GET CONVERSATIONS FOR A TICKET
router.get("/tickets/:ticketId/conversations", authenticateToken, requireEmployeeAccess, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const result = await pool.query(
      `
      SELECT id, ticket_id, author, message, created_at
      FROM ticket_conversations 
      WHERE ticket_id = $1
      ORDER BY created_at DESC
      `,
      [ticketId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

module.exports = router;
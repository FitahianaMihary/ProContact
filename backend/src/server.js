const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const ticketRoutes = require("./routes/tickets");
const serviceRoutes = require("./routes/services");
const subscriptionRoutes = require("./routes/subscriptions");
const paymentRoutes = require("./routes/payments");
const notificationRoutes = require("./routes/notifications");
const complaintRoutes = require("./routes/complaints");
const reportsRoutes = require("./routes/reports");

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// ✅ Configuration CORS dynamique (localhost + IP locale autorisés)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://192.168.137.1:5173", // ✅ accès depuis ton téléphone
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn("❌ CORS bloqué pour :", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ✅ Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.path === "/api/health",
  message: "Trop de requêtes, veuillez réessayer plus tard.",
});
app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ Fichiers statiques
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes principales
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/reports", reportsRoutes);

// ✅ Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// ✅ Middleware global d'erreurs
app.use((err, req, res, next) => {
  console.error("Erreur globale :", err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  });
});

// ✅ 404
app.use("*", (req, res) => {
  console.log(`Route non trouvée : ${req.method} ${req.path}`);
  res.status(404).json({ error: "Route not found" });
});

// ✅ Démarrage du serveur sur toutes les interfaces réseau
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://192.168.137.1:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});

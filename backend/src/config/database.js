// backend/src/config/database.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
const parse = require('pg-connection-string').parse;

dotenv.config();

const config = parse(process.env.DATABASE_URL);

// S'assure que le mot de passe est bien une chaîne
if (typeof config.password !== 'string') {
  throw new Error('PostgreSQL password must be a string');
}

const pool = new Pool({
  user: config.user,
  host: config.host,
  database: config.database,
  password: config.password,
  port: config.port,
  ssl: false, // tu peux mettre `true` en prod si besoin
});

module.exports = pool;

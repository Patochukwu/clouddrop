const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const fileRoutes = require('./routes/files');

const app = express();

// ── Security & logging ───────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));

// ── CORS ─────────────────────────────────────────────────────
// Seed allowed origins with localhost variants (dev)
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
]);

// Add CLIENT_URL from .env (EC2, CloudFront, etc.)
if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(',').map(u => u.trim()).forEach(u => {
    allowedOrigins.add(u);
    // Also allow the https variant automatically
    if (u.startsWith('http://')) allowedOrigins.add(u.replace('http://', 'https://'));
    if (u.startsWith('https://')) allowedOrigins.add(u.replace('https://', 'http://'));
  });
}

const corsOptionsDelegate = (req, callback) => {
  const origin = req.header('Origin');
  let isAllowed = false;

  if (!origin) {
    // Server-to-server or same-origin (no Origin header) — allow
    isAllowed = true;
  } else if (allowedOrigins.has(origin)) {
    isAllowed = true;
  } else {
    // Dynamically allow same host (covers CloudFront domain, custom domains, etc.)
    const host = req.header('host');
    if (host) {
      if (
        origin === `http://${host}` ||
        origin === `https://${host}`
      ) {
        isAllowed = true;
      }
    }
  }

  callback(null, {
    origin: isAllowed,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
};

app.use(cors(corsOptionsDelegate));

app.use(express.json());

// ── API Routes ───────────────────────────────────────────────
app.get('/api/test', (_req, res) => {
  res.json({ status: 'ok', message: 'CloudDrop API is running' });
});

app.use('/api/files', fileRoutes);

// ── Serve built React client (production / EC2) ──────────────
// When the client is built, serve it from server so a single port handles everything
const clientDist = path.join(__dirname, '../..', 'client', 'dist');
app.use(express.static(clientDist));
// Catch-all: serve React app for any non-API route
// Uses regex to avoid path-to-regexp v8+ breaking change with bare '*'
app.get(/^(?!\/api).*$/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;

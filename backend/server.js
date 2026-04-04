/**
 * server.js
 * Express server for the ESG Value Engine API.
 * Deploy on Railway (not Vercel — needs persistent process + writable filesystem for cache dev).
 */

import express from 'express';
import cors from 'cors';
import analyzeHandler       from './api/analyze.js';
import analyzeStreamHandler from './api/analyzeStream.js';
import predictHandler       from './api/predict.js';
import mapHandler           from './api/map.js';
import sfdrHandler          from './api/sfdr.js';
import greenwashHandler     from './api/greenwash.js';

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman) and configured origins
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// ── ROUTES ───────────────────────────────────────────────────────────────────
app.post('/api/analyze',        analyzeHandler);
app.post('/api/analyze/stream', analyzeStreamHandler);
app.post('/api/predict',        predictHandler);
app.post('/api/map',            mapHandler);
app.post('/api/sfdr',           sfdrHandler);
app.post('/api/greenwash',      greenwashHandler);

app.get('/health', (_, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ESG Value Engine API running on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});

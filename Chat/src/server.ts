/**
 * server.ts
 *
 * GhostWire API — Server bootstrap and configuration.
 *
 * Overview:
 * - Loads environment variables and initializes shared resources (DB pool).
 * - Configures middleware (CORS, body parsing) and mounts application routes.
 * - Provides a global error handler and starts the HTTP server.
 *
 * Usage:
 * - Development: `npm run dev` (requires `nodemon`)
 * - Run directly (cross-shell safe): `node -r ts-node/register ./server.ts`
 *
 * Environment Variables (defaults shown):
 * - PORT: 3000
 * - DB_HOST: localhost
 * - DB_USER: root
 * - DB_PASSWORD: ''
 * - DB_NAME: ghostwire
 * - NODE_ENV: development | production
 *
 * Quick troubleshooting:
 * - If `npm`/`npx` is blocked on PowerShell, run commands in CMD or use `node -r ts-node/register` directly.
 * - If module resolution fails, verify relative import paths end with `.ts` or `.js` consistently.
 *
 * Endpoints (high-level):
 * - GET  /                           -> Health check
 * - POST /api/auth/register          -> Register a new user
 * - POST /api/auth/login             -> Authenticate and get a token
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { Database } from './config/Database.ts';

import authRoutes from './routes/authRoutes.ts';
import groupRoutes from './routes/groupRoutes.ts';

import path from 'path';

// Socket Server
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { setupSocketServer } from './sockets/socketServer.ts';

// 1. Load Environment Variables
dotenv.config();

// 2. Initialize Database Pool
// This starts the connection pool immediately so it's ready for requests
Database.init();

const app = express();

// Serve public static files (frontend pages, css, js)
app.use(express.static(path.resolve(process.cwd(), '..', 'public')));

// 3. Middleware Setup
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 4. Mount API Routes
// All auth endpoints will live under /api/auth
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);

// Example: app.use('/api/groups', groupRoutes);

// 5. Root Route (Health Check) — serve the frontend index
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), '..', 'public', 'index.html'));
});

// 6. Global Error Handler (The Safety Net)
// If any controller throws an error, it lands here instead of crashing the server
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Uncaught Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 7. Start the Server (now with socket.io)
const PORT = process.env.PORT || 3000;

// Create an HTTP server so we can attach socket.io to it
const server = http.createServer(app);

// Initialize Socket.IO server with permissive CORS for local dev
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Wire up socket event handlers
setupSocketServer(io);

server.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`GhostWire Server Running`);
  console.log(`Port: ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log(`=================================`);
});
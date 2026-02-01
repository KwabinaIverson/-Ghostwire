import express from 'express';
import { AuthController } from '../controllers/authController.ts';

const router = express.Router();

// POST /api/auth/register
// Body: { username, email, password }
router.post('/register', AuthController.register);

// POST /api/auth/login
// Body: { email, password }
router.post('/login', AuthController.login);

// POST /api/auth/logout
router.post('/logout', AuthController.logout);

// GET /api/auth/me - return the current user (protected)
import { authenticate } from '../middleware/authMiddleware.ts';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer storage for avatar uploads (destination created on demand)
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(process.cwd(), '..', 'public', 'uploads', 'avatars');
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* ignore */ }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const extMatch = file.originalname.match(/\.[^.]+$/) || [''];
    const ext = extMatch[0];
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,7)}${ext}`);
  }
});
const avatarUpload = multer({ storage: avatarStorage, limits: { fileSize: 2 * 1024 * 1024 } });

router.get('/me', authenticate, AuthController.me);

// Search users (GET /api/auth/users?q=...)
router.get('/users', authenticate, AuthController.searchUsers);

// Upload avatar (multipart/form-data) - field name: 'avatar'
router.post('/me/avatar', authenticate, avatarUpload.single('avatar'), AuthController.uploadAvatar);

// PATCH /api/auth/me - update profile (username, avatarUrl, color)
router.patch('/me', authenticate, AuthController.updateProfile);

export default router;
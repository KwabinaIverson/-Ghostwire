import express from 'express';
import { AuthController } from '../controllers/authController.ts';
import { authenticate } from '../middleware/authMiddleware.ts';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// multer setup
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(process.cwd(), '..', 'public', 'uploads', 'avatars');
    try { fs.mkdirSync(dir, { recursive: true }); } catch(e) {}
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const extMatch = file.originalname.match(/\.[^.]+$/) || [''];
    const ext = extMatch[0];
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,7)}${ext}`);
  }
});
const avatarUpload = multer({ storage: avatarStorage, limits: { fileSize: 2*1024*1024 } });

// routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.me);
router.get('/users', authenticate, AuthController.searchUsers);
router.post('/me/avatar', authenticate, avatarUpload.single('avatar'), AuthController.uploadAvatar);
router.patch('/me', authenticate, AuthController.updateProfile);

export default router;
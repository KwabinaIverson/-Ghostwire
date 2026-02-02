import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthService } from '../services/authService.ts';
import { RegisterUserDto } from '../dtos/registerDTO.ts';
import { LoginDto } from '../dtos/loginDTO.ts';

const authService = new AuthService();

export class AuthController {

  static async register(req: Request, res: Response) {
    try {
      const dto = new RegisterUserDto(req.body);
      const error = dto.validate();
      if (error) return res.status(400).json({ error });

      const user = await authService.register(dto);
      return res.status(201).json({ message: "User registered", user });

    } catch (err: any) {
      if (err.message === "Email already registered.") {
        return res.status(409).json({ error: err.message });
      }
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const dto = new LoginDto(req.body);
      const error = dto.validate();
      if (error) return res.status(400).json({ error });

      const { token, user } = await authService.login(dto);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.status(200).json({ message: "Login successful", user });

    } catch (err: any) {
      if (err.message === "Invalid credentials.") {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  static logout(req: Request, res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    return res.status(200).json({ message: 'Logged out' });
  }

  static async me(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const { UserRepository } = await import('../repositories/UserRepository.ts');
    const repo = new UserRepository();
    const full = await repo.findById(user.id);
    if (!full) return res.status(404).json({ error: 'User not found' });

    return res.status(200).json({ user: full.toProfile() });
  }

  /**
   * PATCH /api/auth/me - update profile (username, avatarUrl, color)
   */
  static async updateProfile(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const body = req.body || {};

    const payload: {
      username?: string | null;
      avatarUrl?: string | null;
      color?: string | null;
    } = {};

    if ('username' in body) payload.username = body.username ?? null;
    if ('avatarUrl' in body) payload.avatarUrl = body.avatarUrl ?? null;
    if ('color' in body) payload.color = body.color ?? null;

    try {
      const { UserRepository } = await import('../repositories/UserRepository.ts');
      const repo = new UserRepository();
      const updated = await repo.updateProfile(user.id, payload);

      return res.status(200).json({
        message: 'Profile updated',
        user: updated.toProfile()
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  /**
   * POST /api/auth/me/avatar - upload avatar
   * multer should attach `file` on req
   */
  static async uploadAvatar(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const dir = path.resolve(process.cwd(), '..', 'public', 'uploads', 'avatars');
    const filepath = path.join(dir, file.filename);

    try {
      const sharpModule = await import('sharp');
      const sharp = (sharpModule as any).default || sharpModule;

      // resize to 256x256
      const tmpPath = filepath + '.tmp';
      await sharp(filepath).resize(256, 256, { fit: 'cover' }).toFile(tmpPath);
      await fs.promises.rename(tmpPath, filepath);

      // create thumbnail 64x64
      const thumbName = `thumb-${file.filename}`;
      const thumbPath = path.join(dir, thumbName);
      await sharp(filepath).resize(64, 64, { fit: 'cover' }).toFile(thumbPath);

      const avatarUrl = `/uploads/avatars/${file.filename}`;
      const { UserRepository } = await import('../repositories/UserRepository.ts');
      const repo = new UserRepository();
      const updated = await repo.updateProfile(user.id, { avatarUrl, color: null });

      return res.status(200).json({ message: 'Avatar uploaded', user: updated.toProfile() });

    } catch (err: any) {
      console.error('Avatar processing error:', err);
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }
  }

  /**
   * GET /api/auth/users?q=term - search users by username or email
   */
  static async searchUsers(req: Request, res: Response) {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) return res.status(200).json([]);

    try {
      const { UserRepository } = await import('../repositories/UserRepository.ts');
      const repo = new UserRepository();
      const users = await repo.search(q);

      const payload = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        avatarUrl: u.avatarUrl,
        color: u.color
      }));

      return res.status(200).json(payload);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: 'Search failed' });
    }
  }

}
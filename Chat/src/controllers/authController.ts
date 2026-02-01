import type { Request, Response } from 'express';
import { AuthService } from '../services/authService.ts';
import { RegisterUserDto } from '../dtos/registerDTO.ts';
import { LoginDto } from '../dtos/loginDTO.ts';
import path from 'path';
import fs from 'fs';

// Instantiate the service once
const authService = new AuthService();

export class AuthController {
  
  /**
   * Handle User Registration
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response) {
    try {
      // 1. Wrap body in DTO
      const dto = new RegisterUserDto(req.body);
      
      // 2. Validate
      const error = dto.validate();
      if (error) {
        return res.status(400).json({ error });
      }

      // 3. Call Service
      const result = await authService.register(dto);
      
      // 4. Return Success
      return res.status(201).json({ 
        message: "User registered successfully", 
        user: result 
      });

    } catch (err: any) {
      // Handle known errors (like "Email already exists")
      if (err.message === "Email already registered.") {
        return res.status(409).json({ error: err.message });
      }
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  /**
   * Handle User Login
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response) {
    try {
      const dto = new LoginDto(req.body);
      
      const error = dto.validate();
      if (error) {
        return res.status(400).json({ error });
      }

      const result = await authService.login(dto);
      
      // Attach token as secure httponly cookie so the browser will send it automatically
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      } as any;

      res.cookie('token', result.token, cookieOptions);

      return res.status(200).json({
        message: "Login successful",
        user: result.user
      });

    } catch (err: any) {
      if (err.message === "Invalid credentials.") {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  /**
   * Logout - clears the auth cookie
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    } as any;
    res.clearCookie('token', cookieOptions);
    return res.status(200).json({ message: 'Logged out' });
  }

  /**
   * Return the authenticated user's decoded token data
   * GET /api/auth/me
   */
  static async me(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    // Re-fetch fresh user profile from DB
    const repo = new (await import('../repositories/UserRepository.ts')).UserRepository();
    const full = await repo.findById(user.id);
    if (!full) return res.status(404).json({ error: 'User not found' });

    return res.status(200).json({ user: full.toProfile() });
  }

  static async updateProfile(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

  const body = req.body || {};

  // explicitly normalize undefined → omit
  const payload: {
    username?: string | null;
    avatarUrl?: string | null;
    color?: string | null;
  } = {};

  if ('username' in body) payload.username = body.username ?? null;
  if ('avatarUrl' in body) payload.avatarUrl = body.avatarUrl ?? null;
  if ('color' in body) payload.color = body.color ?? null;

  try {
    const repo = new (await import('../repositories/UserRepository.ts')).UserRepository();
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
   * Upload a profile avatar image. Expects multipart/form-data with 'avatar' field.
   * This will resize/crop the image to 256x256 and create a small thumbnail 64x64.
   */
  static async uploadAvatar(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    // Multer should attach `file` on the request
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // Paths
    const dir = path.resolve(process.cwd(), '..', 'public', 'uploads', 'avatars');
    const filepath = path.join(dir, file.filename);

    try {
      // Dynamically import sharp to avoid startup failure when dependency missing
      const sharpModule = await import('sharp');
      const sharp = (sharpModule as any).default || sharpModule;

      // Resize/crop to 256x256 (cover) and overwrite the original
      const tmpPath = filepath + '.tmp';
      await sharp(filepath).resize(256, 256, { fit: 'cover' }).toFile(tmpPath);
      await fs.promises.rename(tmpPath, filepath);

      // Create a thumbnail 64x64
      const thumbName = `thumb-${file.filename}`;
      const thumbPath = path.join(dir, thumbName);
      await sharp(filepath).resize(64, 64, { fit: 'cover' }).toFile(thumbPath);

      // Persist avatar url (use the resized image)
      const avatarUrl = `/uploads/avatars/${file.filename}`;
      const repo = new (await import('../repositories/UserRepository.ts')).UserRepository();
      const updated = await repo.updateProfile(user.id, { avatarUrl, color: null });
      return res.status(200).json({ message: 'Avatar uploaded', user: updated.toProfile() });
    } catch (err: any) {
      console.error('Avatar processing error:', err);
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }
  }

  /**
   * Search users by username or email. GET /api/auth/users?q=term
   */
  static async searchUsers(req: Request, res: Response) {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) return res.status(200).json([]);

    try {
      const repo = new (await import('../repositories/UserRepository.ts')).UserRepository();
      const users = await repo.search(q);
      const payload = users.map(u => ({ id: (u as any).id, username: u.username, email: u.email, avatarUrl: u.avatarUrl, color: u.color }));
      return res.status(200).json(payload);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: 'Search failed' });
    }
  }
}
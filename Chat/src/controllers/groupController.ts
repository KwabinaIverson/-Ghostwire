import type { Request, Response } from 'express';
import { GroupService } from '../services/groupService.ts';
import { CreateGroupDto } from '../dtos/groupDTO.ts';

const groupService = new GroupService();

export class GroupController {

  // POST /api/groups
  static async create(req: Request, res: Response) {
    try {
      // 1. Get User ID from the JWT Middleware (req.user)
      // We assume you have an 'authenticate' middleware running before this.
      const userId = (req as any).user?.id; 
      
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // Ensure the admin user actually exists in the database to avoid FK errors
      const { UserRepository } = await import('../repositories/UserRepository.ts');
      const userRepo = new UserRepository();
      let adminUser = await userRepo.findById(userId);
      if (!adminUser) {
        // Attempt to repair by finding by email in the token payload
        const tokenPayload = (req as any).user || {};
        const maybeEmail = tokenPayload.email;
        if (maybeEmail) {
          const found = await userRepo.findByEmail(maybeEmail);
          if (found) {
            adminUser = found;
          }
        }
      }

      // If admin still not found, provision a user record automatically (generate password hash)
      if (!adminUser) {
        try {
          const bcrypt = (await import('bcryptjs')).default || (await import('bcryptjs'));
          const tokenPayload = (req as any).user || {};
          const suggestedUsername = (tokenPayload.username || (tokenPayload.email || '').split('@')[0] || 'user').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'user';
          let usernameToTry = suggestedUsername;
          // Avoid username collisions
          let suffix = 1;
          while (true) {
            try {
              // ensure username isn't already taken
              const byName = await userRepo.search(usernameToTry);
              if ((byName || []).length === 0) break;
              usernameToTry = `${suggestedUsername}${suffix++}`;
            } catch (e) { break; }
          }

          const randomPass = (Math.random().toString(36) + 'A1!').slice(0, 12);
          const hash = await bcrypt.hash(randomPass, 10);
          const { User } = await import('../domain/User.ts');
          const newUser = new User(usernameToTry, tokenPayload.email || `${usernameToTry}@example.com`, hash);
          const saved = await userRepo.save(newUser as any);
          adminUser = saved;
          console.log('Provisioned missing user for token:', adminUser.id);
        } catch (err) {
          console.error('Failed to provision missing user:', err);
          return res.status(400).json({ error: 'Invalid authenticated user (user not found) and auto-provision failed' });
        }
      }

      // 2. Validate DTO (adminId might be adjusted below if we provision)
      let dto = new CreateGroupDto(req.body, userId);
      let error = dto.validate();
      if (error) return res.status(400).json({ error });

      // If we resolved or provisioned a different admin user, ensure dto.adminId matches DB id
      if (adminUser && (adminUser as any).id && (adminUser as any).id !== userId) {
        dto = new CreateGroupDto(req.body, (adminUser as any).id);
      }

      // Enforce per-user group creation limit (max 5)
      const adminToCheck = dto.adminId || (adminUser && (adminUser as any).id) || userId;
      try {
        const existing = await groupService.countGroupsByAdmin(adminToCheck as any);
        if (existing >= 5) {
          return res.status(400).json({ error: 'Group creation limit reached (max 5 groups)' });
        }
      } catch (err) {
        console.warn('Could not determine existing group count for user', adminToCheck, err);
      }

      // 3. Call Service
      let group;
      try {
        group = await groupService.createGroup(dto);
        console.log('Group created:', group.id, 'by', (adminUser && (adminUser as any).id) || userId);
      } catch (err: any) {
        // Handle foreign key or DB issues with a clearer message
        if (err && (err.code === 'ER_NO_REFERENCED_ROW_2' || /foreign key/i.test(String(err.message || err)))) {
          return res.status(400).json({ error: 'Invalid admin user or related data missing' });
        }
        throw err;
      }

      // 4. Optionally add members (members can be emails or userIds)
      const { members } = req.body || {};
      let resolved: string[] = [];
      if (Array.isArray(members) && members.length > 0) {
        const { UserRepository } = await import('../repositories/UserRepository.ts');
        const userRepo = new UserRepository();
        resolved = [];
        for (const m of members) {
          if (typeof m === 'string') {
            // email
            if (m.includes('@')) {
              const u = await userRepo.findByEmail(m);
              if (u) resolved.push((u as any).id);
            } else {
              // assume it's already a user id
              resolved.push(m);
            }
          } else if ((m as any).id) {
            resolved.push((m as any).id);
          }
        }
      }

      // If we resolved member ids, pass them into createGroup so it's all one transaction
      if (resolved.length > 0) {
        const groupWithMembers = await groupService.createGroup(dto, resolved);
        return res.status(201).json({ message: 'Group created', group: groupWithMembers });
      }

      return res.status(201).json({ message: "Group created", group });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/groups (My Groups)
  static async listMyGroups(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const groups = await groupService.getUserGroups(userId);
      return res.status(200).json(groups);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/groups/:id/members
  static async addMembers(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const groupId = req.params.id;
      const { emails, userIds } = req.body || {};

      const resolvedIds: string[] = [];

      if (Array.isArray(userIds)) {
        resolvedIds.push(...userIds);
      }

      if (Array.isArray(emails)) {
        const { UserRepository } = await import('../repositories/UserRepository.ts');
        const userRepo = new UserRepository();
        for (const e of emails) {
          const u = await userRepo.findByEmail(e);
          if (u) resolvedIds.push(u.id as any);
        }
      }

      if (resolvedIds.length === 0) return res.status(400).json({ error: 'No valid users to add' });

      await groupService.addMembers(groupId, resolvedIds);
      return res.status(200).json({ message: 'Members added', added: resolvedIds.length });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }
}
import type { Request, Response } from 'express';
import { GroupService } from '../services/groupService.ts';
import { CreateGroupDto } from '../dtos/groupDTO.ts';
import { UserRepository } from '../repositories/UserRepository.ts';
import { GroupRepository } from '../repositories/GroupRepository.ts';
import { MessageRepository } from '../repositories/MessageRepository.ts';

const groupService = new GroupService();
const userRepo = new UserRepository();
const groupRepo = new GroupRepository();

export class GroupController {

  // POST /api/groups
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await userRepo.findById(userId);
      if (!user) return res.status(403).json({ error: 'User does not exist.' });

      const dto = new CreateGroupDto(req.body, user.id);
      const error = dto.validate();
      if (error) return res.status(400).json({ error });

      const existingCount = await groupService.countGroupsByAdmin(user.id);
      if (existingCount >= 5) return res.status(400).json({ error: 'Group creation limit reached (max 5).' });

      const group = await groupService.createGroup(dto);
      return res.status(201).json({ message: 'Group created', group });

    } catch (err: any) {
      console.error('GroupController.create error:', err);
      return res.status(500).json({ error: 'Failed to create group' });
    }
  }

  // GET /api/groups
  static async listMyGroups(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await userRepo.findById(userId);
      if (!user) return res.status(403).json({ error: 'User does not exist' });

      const groups = await groupService.getUserGroups(user.id);
      return res.status(200).json(groups);

    } catch (err: any) {
      console.error('GroupController.listMyGroups error:', err);
      return res.status(500).json({ error: 'Failed to fetch groups' });
    }
  }

  // POST /api/groups/:id/members
static async addMembers(req: Request, res: Response) {
  try {
    const authUserId = (req as any).user?.id;
    if (!authUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await userRepo.findById(authUserId);
    if (!user) {
      return res.status(403).json({ error: 'User does not exist' });
    }

    const groupId = req.params.id;
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID required' });
    }

    // support BOTH payload styles
    const {
      userIds = [],
      members = [],
      emails = []
    } = req.body || {};

    const resolvedIds: string[] = [];

    // accept userIds or members (frontend uses members)
    const rawIds = Array.isArray(userIds) && userIds.length
      ? userIds
      : Array.isArray(members)
        ? members
        : [];

    for (const id of rawIds) {
      if (typeof id === 'string' && id.trim().length > 0) {
        resolvedIds.push(id);
      }
    }

    // resolve emails → ids
    if (Array.isArray(emails)) {
      for (const email of emails) {
        const u = await userRepo.findByEmail(email);
        if (u?.id) {
          resolvedIds.push(u.id);
        }
      }
    }

    // final hard guard
    const uniqueIds = [...new Set(resolvedIds)];

    if (uniqueIds.length === 0) {
      return res.status(400).json({ error: 'No valid users to add' });
    }

    await groupService.addMembers(groupId, uniqueIds);

    return res.status(200).json({
      message: 'Members added',
      added: uniqueIds.length
    });

  } catch (err: any) {
    console.error('GroupController.addMembers error:', err);
    return res.status(500).json({ error: 'Failed to add members' });
  }
}


  // GET /api/groups/:groupId/messages
  static async getMessages(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      if (!groupId) return res.status(400).json({ error: 'Group ID required' });

      const messages = await MessageRepository.getMessagesByGroupId(groupId);
      return res.status(200).json(messages);

    } catch (err) {
      console.error('GroupController.getMessages error:', err);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }
}
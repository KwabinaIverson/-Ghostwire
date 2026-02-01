import express from 'express';
import { GroupController } from '../controllers/groupController.ts';
import { authenticate } from '../middleware/authMiddleware.ts';

const router = express.Router();

// Protect these routes with JWT authentication
router.post('/', authenticate, GroupController.create);
router.get('/', authenticate, GroupController.listMyGroups);

// Add members to a group by emails or userIds
router.post('/:id/members', authenticate, GroupController.addMembers);

export default router;
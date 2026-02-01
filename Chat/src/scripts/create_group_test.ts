import 'dotenv/config';
import { Database } from '../config/Database.ts';
import { UserRepository } from '../repositories/UserRepository.ts';
import { GroupService } from '../services/groupService.ts';

async function main() {
  Database.init();

  const userRepo = new UserRepository();
  const groupService = new GroupService();

  const adminEmail = process.argv[2] || 'admin@example.com';
  const groupName = process.argv[3] || 'Test Group from Script';
  const memberEmails = process.argv.slice(4);

  console.log('Finding admin by email:', adminEmail);
  const admin = await userRepo.findByEmail(adminEmail);
  if (!admin) {
    console.error('Admin user not found. Create a user with that email first.');
    process.exit(1);
  }

  const dto: any = { name: groupName, description: '' };
  // GroupService expects CreateGroupDto instance, but it constructs Group internally; use the service directly via controller-like code

  try {
    // create group
    const created = await groupService.createGroup({ name: groupName, description: '', adminId: admin.id } as any);
    console.log('Group created:', created);

    // If member emails provided, resolve and add
    if (memberEmails.length > 0) {
      const resolved: string[] = [];
      for (const e of memberEmails) {
        const u = await userRepo.findByEmail(e);
        if (u) resolved.push((u as any).id);
      }
      if (resolved.length > 0) {
        await groupService.addMembers(created.id, resolved);
        console.log('Added members:', resolved);
      }
    }

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating group:', err);
    process.exit(1);
  }
}

main();
import 'dotenv/config';
import { Database } from '../config/Database.ts';
import { UserRepository } from '../repositories/UserRepository.ts';
import { GroupRepository } from '../repositories/GroupRepository.ts';

async function main() {
  Database.init();
  const userRepo = new UserRepository();
  const groupRepo = new GroupRepository();

  const email = process.argv[2] || 'Test@Admin.com';
  const user = await userRepo.findByEmail(email);
  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }

  const groups = await groupRepo.findUserGroups((user as any).id);
  console.log('Groups for', user.username, groups);
}

main().catch(e => { console.error(e); process.exit(1); });
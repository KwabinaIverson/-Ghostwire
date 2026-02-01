import 'dotenv/config';
import { Database } from '../config/Database.ts';
import { UserRepository } from '../repositories/UserRepository.ts';

async function main() {
  Database.init();
  const r = new UserRepository();
  const rows = await r.search('');
  console.log('Found users:', rows.map(u => ({ id: (u as any).id, username: u.username, email: u.email }))); 
}

main().catch(e => { console.error(e); process.exit(1); });
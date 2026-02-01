import 'dotenv/config';
import { Database } from '../config/Database.ts';

async function main() {
  Database.init();
  const rows = await Database.query<any[]>('SELECT * FROM `groups` ORDER BY created_at DESC LIMIT 50');
  console.log('Groups:', rows);
}

main().catch(e => { console.error(e); process.exit(1); });
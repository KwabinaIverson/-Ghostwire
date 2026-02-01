import 'dotenv/config';
import jwt from 'jsonwebtoken';
async function main() {
  const fetch = globalThis.fetch as any;
  if (!fetch) throw new Error('fetch not available in this Node runtime');
  const secret = process.env.JWT_SECRET || 'default_secret';
  // Make a token with id that doesn't exist in users table
  const payload = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', username: 'Provisioned', email: 'prov@example.com' };
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });

  console.log('Using token:', token);

  const res = await fetch('http://localhost:3000/api/groups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name: 'Provisioned Group', description: '', members: [] })
  });

  const txt = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', txt);
}

main().catch(err => { console.error(err); process.exit(1); });
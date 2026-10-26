import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from './db.js';

try {
  const username = process.env.INITIAL_MANAGER_USERNAME;
  const password = process.env.INITIAL_MANAGER_PASSWORD;
  const fullName = process.env.INITIAL_MANAGER_NAME || 'System Manager';
  if (!username || !password || password.length < 12) {
    throw new Error('Set INITIAL_MANAGER_USERNAME and INITIAL_MANAGER_PASSWORD (at least 12 characters) in backend/.env first.');
  }
  const [roles] = await db.execute("SELECT role_id FROM roles WHERE role_name = 'manager'");
  if (!roles.length) throw new Error('Run database/schema.sql before creating the manager.');
  const [existing] = await db.execute('SELECT user_id FROM users WHERE username = ?', [username]);
  if (existing.length) throw new Error('That username already exists; no account was changed.');
  const hash = await bcrypt.hash(password, 12);
  await db.execute('INSERT INTO users (role_id, username, password_hash, full_name) VALUES (?, ?, ?, ?)', [roles[0].role_id, username, hash, fullName]);
  console.log(`Manager account created: ${username}`);
} finally { await db.end(); }

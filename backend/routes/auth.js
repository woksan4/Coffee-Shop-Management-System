import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import { signToken, requireAuth } from '../auth.js';
import { asyncHandler, HttpError, requireText } from '../utils.js';

const router = Router();
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many login attempts. Try again later.' } });
router.post('/login', loginLimit, asyncHandler(async (req, res) => {
  const username = requireText(req.body?.username, 'Username', 50);
  const password = String(req.body?.password ?? '');
  if (!password || password.length > 200) throw new HttpError(400, 'Username and password are required');
  const [rows] = await db.execute(
    `SELECT u.user_id, u.username, u.password_hash, u.full_name, u.is_active, r.role_name
     FROM users u JOIN roles r ON r.role_id = u.role_id WHERE u.username = ? LIMIT 1`, [username]
  );
  const user = rows[0];
  const valid = user && user.is_active && await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new HttpError(401, 'Incorrect username or password');
  res.json({ token: signToken(user), user: { id: user.user_id, username: user.username, full_name: user.full_name, role: user.role_name } });
}));
router.get('/me', requireAuth(), asyncHandler(async (req, res) => {
  res.json({ user: { id: req.user.user_id, username: req.user.username, full_name: req.user.full_name, role: req.user.role_name } });
}));
export default router;

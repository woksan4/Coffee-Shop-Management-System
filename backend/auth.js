import jwt from 'jsonwebtoken';
import db from './db.js';
import { HttpError, asyncHandler } from './utils.js';

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error('JWT_SECRET must be set to at least 32 characters');
  return value;
}
export const signToken = (user) => jwt.sign({ sub: user.user_id, role: user.role_name }, secret(), { expiresIn: '8h', issuer: 'coffee-shop-api' });

export function requireAuth(...roles) {
  return asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Login required');
    let payload;
    try { payload = jwt.verify(token, secret(), { issuer: 'coffee-shop-api' }); }
    catch { throw new HttpError(401, 'Invalid or expired session'); }
    const [rows] = await db.execute(
      `SELECT u.user_id, u.username, u.full_name, u.is_active, r.role_name
       FROM users u JOIN roles r ON r.role_id = u.role_id WHERE u.user_id = ?`, [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.is_active) throw new HttpError(401, 'Account is inactive');
    if (roles.length && !roles.includes(user.role_name)) throw new HttpError(403, 'Insufficient permissions');
    req.user = user;
    next();
  });
}

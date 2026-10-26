export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, 'Invalid id');
  return id;
}
export function requireText(value, label, max = 120) {
  const text = String(value ?? '').trim();
  if (!text || text.length > max) throw new HttpError(400, `${label} is required (maximum ${max} characters)`);
  return text;
}
export function positiveNumber(value, label, { allowZero = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || (allowZero ? n < 0 : n <= 0)) throw new HttpError(400, `${label} must be ${allowZero ? 'zero or greater' : 'greater than zero'}`);
  return n;
}

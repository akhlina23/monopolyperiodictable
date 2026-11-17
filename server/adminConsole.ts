import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export interface AdminAuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  target: string;
  previousValue: string;
  newValue: string;
  reason: string;
  gameId: string;
  actorSessionId: string;
}

const COOKIE_NAME = 'ptm_v2_admin_session';
export const ADMIN_SESSION_COOKIE_NAME = COOKIE_NAME;
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const RATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FAILED_ATTEMPTS = 5;

const processSecret =
  process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const activeSessions = new Map<string, { createdAt: number; expiresAt: number }>();
const failedLoginMap = new Map<string, number[]>();
const adminAuditLogs: AdminAuditLogEntry[] = [];

function sha256(value: string): Buffer {
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

export function constantTimeVerifyPassword(candidate: string, expected: string): boolean {
  if (!expected || !candidate) return false;
  return crypto.timingSafeEqual(sha256(candidate), sha256(expected));
}

export function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const recent = (failedLoginMap.get(ip) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  failedLoginMap.set(ip, recent);
  if (recent.length >= MAX_FAILED_ATTEMPTS) {
    const oldest = recent[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const recent = (failedLoginMap.get(ip) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  recent.push(now);
  failedLoginMap.set(ip, recent);
}

export function clearFailedLogins(ip: string): void {
  failedLoginMap.delete(ip);
}

function signSessionPayload(payloadB64: string): string {
  return crypto.createHmac('sha256', processSecret).update(payloadB64).digest('base64url');
}

export function createAdminSessionToken(): { token: string; sid: string; expiresAt: number } {
  const sid = `adm_${crypto.randomBytes(12).toString('hex')}`;
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  activeSessions.set(sid, { createdAt: now, expiresAt });
  const payloadB64 = Buffer.from(JSON.stringify({ sid, exp: expiresAt }), 'utf8').toString('base64url');
  const sig = signSessionPayload(payloadB64);
  return { token: `${payloadB64}.${sig}`, sid, expiresAt };
}

export function verifyAdminSessionToken(token?: string | null): { valid: boolean; sid?: string } {
  if (!token || !token.includes('.')) return { valid: false };
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return { valid: false };

  const expectedSig = signSessionPayload(payloadB64);
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false };
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!parsed?.sid || typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) {
      return { valid: false };
    }
    const sess = activeSessions.get(parsed.sid);
    if (!sess || sess.expiresAt <= Date.now()) {
      activeSessions.delete(parsed.sid);
      return { valid: false };
    }
    return { valid: true, sid: parsed.sid };
  } catch {
    return { valid: false };
  }
}

export function revokeAdminSession(token?: string | null): void {
  const verified = verifyAdminSessionToken(token);
  if (verified.sid) {
    activeSessions.delete(verified.sid);
  }
}

export function extractCookies(cookieHeader?: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!cookieHeader) return map;
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      map[k] = decodeURIComponent(v);
    }
  });
  return map;
}

export function getAdminCookieFromRequest(req: Request): string | undefined {
  const cookies = extractCookies(req.headers.cookie);
  return cookies[COOKIE_NAME];
}

export function setAdminSessionCookie(res: Response, token: string, isHttps?: boolean): void {
  const useSecure = isHttps ?? process.env.NODE_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (useSecure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearAdminSessionCookie(res: Response): void {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  // CSRF custom header enforcement for state-changing admin endpoints
  if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'PTM-Admin') {
    res.status(403).json({ error: 'Permintaan admin membutuhkan header keamanan valid.' });
    return;
  }

  const token = getAdminCookieFromRequest(req);
  const verification = verifyAdminSessionToken(token);
  if (!verification.valid || !verification.sid) {
    res.status(401).json({ error: 'Sesi admin tidak aktif atau telah kedaluwarsa.' });
    return;
  }
  (req as any).adminSessionId = verification.sid;
  next();
}

export function appendAdminAuditLog(entry: Omit<AdminAuditLogEntry, 'id' | 'timestamp'>): AdminAuditLogEntry {
  const full: AdminAuditLogEntry = {
    id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    timestamp: Date.now(),
    ...entry,
  };
  adminAuditLogs.unshift(full);
  if (adminAuditLogs.length > 300) {
    adminAuditLogs.length = 300;
  }
  return full;
}

export function getAdminAuditLogs(): AdminAuditLogEntry[] {
  return [...adminAuditLogs];
}

export function _resetAdminSecurityStateForTests(): void {
  activeSessions.clear();
  failedLoginMap.clear();
  adminAuditLogs.length = 0;
}

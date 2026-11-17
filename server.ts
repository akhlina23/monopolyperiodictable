import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  AIProviderError,
  adminDeleteEducationalRecord,
  adminUpdateEducationalRecord,
  clearDrawCacheEntry,
  generateFreshQuiz,
  generateFreshStudyCase,
  getAISettings,
  getConfiguredProvidersStatus,
  getStoredQuizById,
  getStoredStudyCaseById,
  listAllEducationalRecords,
  sanitizeQuizForClient,
  sanitizeStudyCaseForClient,
  testProviderConnection,
  updateAISettings,
} from './server/aiProviders';
import {
  appendAdminAuditLog,
  checkLoginRateLimit,
  clearAdminSessionCookie,
  clearFailedLogins,
  constantTimeVerifyPassword,
  createAdminSessionToken,
  getAdminAuditLogs,
  getAdminCookieFromRequest,
  getClientIp,
  recordFailedLogin,
  requireAdminAuth,
  revokeAdminSession,
  setAdminSessionCookie,
  verifyAdminSessionToken,
} from './server/adminConsole';

const __appRoot = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__appRoot, '.env') });

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '1mb' }));

// Health & Provider Status (No secrets exposed!)
app.get('/api/health', (_req, res) => {
  const providers = getConfiguredProvidersStatus();
  res.json({
    status: 'ok',
    geminiConfigured: providers.gemini,
    openRouterConfigured: providers.openrouter,
    claudeConfigured: providers.anthropic,
    openAIConfigured: providers.openai,
    adminPasswordConfigured: !!process.env.ADMIN_PASSWORD,
    aiSettings: getAISettings(),
  });
});

// ==================== AI SETTINGS & TESTING ====================

app.get('/api/ai/settings', (_req, res) => {
  res.json({
    settings: getAISettings(),
    providers: getConfiguredProvidersStatus(),
  });
});

app.post('/api/ai/settings', (req, res) => {
  const next = updateAISettings(req.body || {});
  res.json({ settings: next });
});

app.post('/api/ai/test', async (req, res) => {
  const { provider, model } = req.body || {};
  const target = provider || getAISettings().provider;
  const result = await testProviderConnection(target, model);
  res.status(result.ok ? 200 : 502).json(result);
});

// ==================== AI EDUCATIONAL CARDS ====================

// Generate fresh Quiz (answer key stripped until submitted/locked)
app.post('/api/ai/quiz', async (req, res) => {
  try {
    const { element, difficulty, drawEventId, gameId, recentFingerprints, provider, model } =
      req.body || {};
    const record = await generateFreshQuiz({
      element,
      difficulty,
      drawEventId,
      gameId,
      recentFingerprints,
      provider,
      model,
    });
    res.json(sanitizeQuizForClient(record));
  } catch (err: any) {
    const status = err instanceof AIProviderError ? err.status : 500;
    const code = err instanceof AIProviderError ? err.code : 'AI_GENERATION_FAILED';
    res.status(status).json({
      error: err?.message || 'Gagal menghasilkan kuis kimia melalui AI.',
      code,
    });
  }
});

// Submit & Grade Quiz Server-Side (unlocks answer key + explanation after lock)
app.post('/api/ai/quiz/submit', (req, res) => {
  const { quizId, selectedOptionId, timedOut } = req.body || {};
  if (!quizId || typeof quizId !== 'string') {
    res.status(400).json({ error: 'quizId wajib diisi.' });
    return;
  }
  const stored = getStoredQuizById(quizId);
  if (!stored) {
    res.status(404).json({ error: 'Data kuis tidak ditemukan di sesi server.' });
    return;
  }
  const isCorrect = !timedOut && selectedOptionId === stored.correctOptionId;
  res.json({
    quizId: stored.id,
    isCorrect,
    correctOptionId: stored.correctOptionId,
    explanation: stored.explanation,
  });
});

// Generate fresh Study Case (private outline/explanation stripped until peer grading)
app.post('/api/ai/study-case', async (req, res) => {
  try {
    const { element, difficulty, drawEventId, gameId, recentFingerprints, provider, model } =
      req.body || {};
    const record = await generateFreshStudyCase({
      element,
      difficulty,
      drawEventId,
      gameId,
      recentFingerprints,
      provider,
      model,
    });
    res.json(sanitizeStudyCaseForClient(record));
  } catch (err: any) {
    const status = err instanceof AIProviderError ? err.status : 500;
    const code = err instanceof AIProviderError ? err.code : 'AI_GENERATION_FAILED';
    res.status(status).json({
      error: err?.message || 'Gagal menghasilkan studi kasus kimia melalui AI.',
      code,
    });
  }
});

// Reveal Peer Judging Guide after presenter finishes presenting
app.post('/api/ai/study-case/rubric-guide', (req, res) => {
  const { caseId } = req.body || {};
  const stored = typeof caseId === 'string' ? getStoredStudyCaseById(caseId) : undefined;
  if (!stored) {
    res.status(404).json({ error: 'Studi kasus tidak ditemukan di server.' });
    return;
  }
  res.json({
    caseId: stored.id,
    expectedAnswerOutline: stored.expectedAnswerOutline,
    learningExplanation: stored.learningExplanation,
  });
});

// ==================== ADMIN AUTHENTICATION & CONSOLE ====================

app.get('/api/admin/status', (req, res) => {
  const token = getAdminCookieFromRequest(req);
  const v = verifyAdminSessionToken(token);
  res.json({
    authenticated: v.valid,
    adminConfigured: !!process.env.ADMIN_PASSWORD,
  });
});

app.post('/api/admin/login', (req, res) => {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) {
    res.status(503).json({
      error: 'ADMIN_PASSWORD belum diatur pada server Secrets environment.',
    });
    return;
  }

  const ip = getClientIp(req);
  const rate = checkLoginRateLimit(ip);
  if (!rate.allowed) {
    res.status(429).json({
      error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
      retryAfterSeconds: rate.retryAfterSeconds,
    });
    return;
  }

  const candidate = String(req.body?.password || '');
  if (!constantTimeVerifyPassword(candidate, configuredPassword)) {
    recordFailedLogin(ip);
    res.status(401).json({ error: 'Autentikasi gagal. Periksa kembali kredensial admin.' });
    return;
  }

  clearFailedLogins(ip);
  const { token, sid, expiresAt } = createAdminSessionToken();
  const isHttps = req.secure || String(req.headers['x-forwarded-proto'] || '').includes('https');
  setAdminSessionCookie(res, token, isHttps);
  appendAdminAuditLog({
    action: 'ADMIN_LOGIN',
    target: 'session',
    previousValue: 'logged_out',
    newValue: 'authenticated',
    reason: 'Admin logged into console',
    gameId: String(req.body?.gameId || 'global'),
    actorSessionId: sid,
  });
  res.json({ authenticated: true, expiresAt });
});

app.post('/api/admin/logout', (req, res) => {
  const token = getAdminCookieFromRequest(req);
  const v = verifyAdminSessionToken(token);
  if (v.sid) {
    appendAdminAuditLog({
      action: 'ADMIN_LOGOUT',
      target: 'session',
      previousValue: 'authenticated',
      newValue: 'logged_out',
      reason: 'Non-destructive admin logout (game preserved)',
      gameId: String(req.body?.gameId || 'global'),
      actorSessionId: v.sid,
    });
  }
  revokeAdminSession(token);
  clearAdminSessionCookie(res);
  res.json({ authenticated: false, gamePreserved: true });
});

app.get('/api/admin/audit', requireAdminAuth, (_req, res) => {
  res.json({ logs: getAdminAuditLogs() });
});

app.post('/api/admin/audit', requireAdminAuth, (req, res) => {
  const { action, target, previousValue, newValue, reason, gameId } = req.body || {};
  const entry = appendAdminAuditLog({
    action: String(action || 'ADMIN_MUTATION'),
    target: String(target || 'state'),
    previousValue: String(previousValue ?? ''),
    newValue: String(newValue ?? ''),
    reason: String(reason || 'Manual admin adjustment'),
    gameId: String(gameId || 'local'),
    actorSessionId: String((req as any).adminSessionId || 'admin'),
  });
  res.json({ entry });
});

// Admin Educational Database Controls (unredacted quizzes, keys, rubrics)
app.get('/api/admin/educational', requireAdminAuth, (_req, res) => {
  res.json(listAllEducationalRecords());
});

app.patch('/api/admin/educational/:kind/:id', requireAdminAuth, (req, res) => {
  const kind = req.params.kind === 'study_case' ? 'study_case' : 'quiz';
  const updated = adminUpdateEducationalRecord(kind, req.params.id, req.body || {});
  if (!updated) {
    res.status(404).json({ error: 'Item tidak ditemukan.' });
    return;
  }
  appendAdminAuditLog({
    action: 'EDUCATIONAL_ITEM_UPDATED',
    target: `${kind}:${req.params.id}`,
    previousValue: 'stored',
    newValue: JSON.stringify(Object.keys(req.body || {})),
    reason: 'Admin edited educational item',
    gameId: updated.gameId || 'global',
    actorSessionId: String((req as any).adminSessionId || 'admin'),
  });
  res.json({ item: updated });
});

app.delete('/api/admin/educational/:kind/:id', requireAdminAuth, (req, res) => {
  const kind = req.params.kind === 'study_case' ? 'study_case' : 'quiz';
  const ok = adminDeleteEducationalRecord(kind, req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Item tidak ditemukan.' });
    return;
  }
  appendAdminAuditLog({
    action: 'EDUCATIONAL_ITEM_DELETED',
    target: `${kind}:${req.params.id}`,
    previousValue: 'active',
    newValue: 'deleted',
    reason: 'Admin deleted invalid generated card',
    gameId: 'global',
    actorSessionId: String((req as any).adminSessionId || 'admin'),
  });
  res.json({ deleted: true });
});

app.post('/api/admin/educational/regenerate', requireAdminAuth, async (req, res) => {
  try {
    const { kind, element, difficulty, drawEventId, gameId } = req.body || {};
    if (drawEventId) clearDrawCacheEntry(drawEventId);
    const created =
      kind === 'study_case'
        ? await generateFreshStudyCase({ element, difficulty, drawEventId, gameId, forceRegenerate: true })
        : await generateFreshQuiz({ element, difficulty, drawEventId, gameId, forceRegenerate: true });
    appendAdminAuditLog({
      action: 'EDUCATIONAL_ITEM_REGENERATED',
      target: `${kind}:${created.id}`,
      previousValue: drawEventId || '-',
      newValue: created.id,
      reason: 'Admin re-ran AI generation',
      gameId: String(gameId || 'global'),
      actorSessionId: String((req as any).adminSessionId || 'admin'),
    });
    res.json({
      item: created,
      publicItem: kind === 'study_case' ? sanitizeStudyCaseForClient(created as any) : sanitizeQuizForClient(created as any),
    });
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'Gagal meregenerasi kartu AI.' });
  }
});

// Explicit /api/* JSON 404 handler BEFORE Vite SPA or static fallback
app.use('/api', (req, res) => {
  res.status(404).json({
    error: `Endpoint API tidak ditemukan: ${req.method} ${req.originalUrl}`,
    code: 'API_NOT_FOUND',
  });
});

// Explicit JSON error handler for /api/* (e.g. malformed JSON body or unhandled route errors)
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) {
      const status =
        typeof err?.status === 'number'
          ? err.status
          : typeof err?.statusCode === 'number'
          ? err.statusCode
          : 500;
      res.status(status).json({
        error: err?.message || 'Terjadi kesalahan internal pada server API.',
        code: err?.code || 'API_INTERNAL_ERROR',
      });
      return;
    }
    next(err);
  }
);

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__appRoot, 'dist');
  const hasDist = isProd && fs.existsSync(path.join(distDir, 'index.html'));

  if (hasDist) {
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      root: __appRoot,
      configFile: path.resolve(__appRoot, 'vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use((req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) return next();
      vite.middlewares(req, res, next);
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Periodic Table Monopoly (V2 Research Edition) running on http://localhost:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Failed to bind dev server on port', PORT, err);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('Server bootstrap failed:', err);
  process.exit(1);
});

import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import { z } from 'zod';
import { AIProviderId, AISettingsConfig, DEFAULT_AI_SETTINGS } from '../src/types/game';

export const QuizOptionSchema = z.object({
  id: z.enum(['A', 'B', 'C', 'D']),
  text: z.string().trim().min(2).max(400),
});

export const QuizGeneratedSchema = z
  .object({
    topic: z.string().trim().min(3).max(160),
    question: z.string().trim().min(10).max(900),
    options: z.array(QuizOptionSchema).length(4),
    correctOptionId: z.enum(['A', 'B', 'C', 'D']),
    explanation: z.string().trim().min(8).max(900),
    sourceNotes: z.string().trim().max(240).optional(),
  })
  .superRefine((val, ctx) => {
    const ids = new Set(val.options.map((o) => o.id));
    if (ids.size !== 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Quiz must have unique A/B/C/D options' });
    }
    const texts = new Set(val.options.map((o) => o.text.toLowerCase()));
    if (texts.size !== 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'All 4 quiz options must be distinct' });
    }
  });

export const StudyCaseGeneratedSchema = z.object({
  title: z.string().trim().min(5).max(180),
  context: z.string().trim().min(20).max(1600),
  task: z.string().trim().min(12).max(900),
  keyConcepts: z.array(z.string().trim().min(2).max(120)).min(1).max(8),
  expectedAnswerOutline: z.array(z.string().trim().min(5).max(500)).min(1).max(6),
  judgingRubric: z
    .array(
      z.object({
        criterion: z.string().trim().min(2).max(140),
        description: z.string().trim().min(4).max(400),
        maxPoints: z.number().int().min(1).max(100),
      })
    )
    .min(2)
    .max(5),
  learningExplanation: z.string().trim().min(10).max(1000),
});

export interface StoredQuizRecord {
  id: string;
  drawEventId: string;
  kind: 'quiz';
  topic: string;
  difficulty: 'mudah' | 'sedang' | 'sulit';
  relatedElements: number[];
  question: string;
  options: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctOptionId: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  sourceNotes?: string;
  fingerprint: string;
  provider: AIProviderId;
  model: string;
  createdAt: number;
  verified: boolean;
  timeLimitSeconds: number;
  gameId?: string;
}

export interface StoredStudyCaseRecord {
  id: string;
  drawEventId: string;
  kind: 'study_case';
  title: string;
  context: string;
  task: string;
  difficulty: 'mudah' | 'sedang' | 'sulit';
  relatedElements: number[];
  keyConcepts: string[];
  expectedAnswerOutline: string[];
  judgingRubric: { criterion: string; description: string; maxPoints: number }[];
  learningExplanation: string;
  fingerprint: string;
  provider: AIProviderId;
  model: string;
  createdAt: number;
  verified: boolean;
  gameId?: string;
}

export class AIProviderError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 502, code = 'AI_GENERATION_FAILED') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface ElementPromptContext {
  atomicNumber?: number;
  symbol?: string;
  nameId?: string;
  nameEn?: string;
  category?: string;
  period?: number;
  groupNumber?: number | null;
}

export const DEFAULT_MODELS_BY_PROVIDER: Record<AIProviderId, string[]> = {
  gemini: ['gemini-4-hydrogen', 'gemini-4-argon'],
  openrouter: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-haiku'],
  anthropic: ['claude-3-5-haiku-latest', 'claude-3-7-sonnet-latest'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
};

let activeAISettings: AISettingsConfig = { ...DEFAULT_AI_SETTINGS };

export function getAISettings(): AISettingsConfig {
  return { ...activeAISettings };
}

export function updateAISettings(patch: Partial<AISettingsConfig>): AISettingsConfig {
  activeAISettings = {
    ...activeAISettings,
    ...patch,
    timeoutMs: Math.max(5000, Math.min(60000, patch.timeoutMs ?? activeAISettings.timeoutMs)),
    maxOutputTokens: Math.max(300, Math.min(4096, patch.maxOutputTokens ?? activeAISettings.maxOutputTokens)),
  };
  return { ...activeAISettings };
}

export function computeFingerprint(text: string, elements: number[]): string {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const payload = `${elements.slice().sort((a, b) => a - b).join(',')}::${normalized}`;
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

// In-memory store for draw idempotency, deduplication, server-side answer keys & Admin inspection
const drawCache = new Map<string, StoredQuizRecord | StoredStudyCaseRecord>();
const quizStore = new Map<string, StoredQuizRecord>();
const studyCaseStore = new Map<string, StoredStudyCaseRecord>();
const fingerprintSet = new Set<string>();

export function sanitizeQuizForClient(rec: StoredQuizRecord) {
  const { correctOptionId: _hiddenKey, explanation: _hiddenExp, ...publicFields } = rec;
  return publicFields;
}

export function sanitizeStudyCaseForClient(rec: StoredStudyCaseRecord) {
  const {
    expectedAnswerOutline: _hiddenOutline,
    learningExplanation: _hiddenExp,
    ...publicFields
  } = rec;
  return publicFields;
}

export function getStoredQuizById(id: string): StoredQuizRecord | undefined {
  return quizStore.get(id);
}

export function getStoredStudyCaseById(id: string): StoredStudyCaseRecord | undefined {
  return studyCaseStore.get(id);
}

export function listAllEducationalRecords() {
  return {
    quizzes: Array.from(quizStore.values()).sort((a, b) => b.createdAt - a.createdAt),
    studyCases: Array.from(studyCaseStore.values()).sort((a, b) => b.createdAt - a.createdAt),
  };
}

export function adminUpdateEducationalRecord(
  kind: 'quiz' | 'study_case',
  id: string,
  patch: Record<string, any>
): StoredQuizRecord | StoredStudyCaseRecord | null {
  if (kind === 'quiz') {
    const existing = quizStore.get(id);
    if (!existing) return null;
    const updated: StoredQuizRecord = { ...existing, ...patch };
    quizStore.set(id, updated);
    drawCache.set(existing.drawEventId, updated);
    return updated;
  } else {
    const existing = studyCaseStore.get(id);
    if (!existing) return null;
    const updated: StoredStudyCaseRecord = { ...existing, ...patch };
    studyCaseStore.set(id, updated);
    drawCache.set(existing.drawEventId, updated);
    return updated;
  }
}

export function adminDeleteEducationalRecord(kind: 'quiz' | 'study_case', id: string): boolean {
  if (kind === 'quiz') {
    const existing = quizStore.get(id);
    if (!existing) return false;
    quizStore.delete(id);
    drawCache.delete(existing.drawEventId);
    return true;
  }
  const existing = studyCaseStore.get(id);
  if (!existing) return false;
  studyCaseStore.delete(id);
  drawCache.delete(existing.drawEventId);
  return true;
}

export function clearDrawCacheEntry(drawEventId: string) {
  drawCache.delete(drawEventId);
}

export function getConfiguredProvidersStatus() {
  return {
    gemini: !!process.env.GEMINI_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new AIProviderError(`Permintaan AI melewati batas waktu (${timeoutMs} ms).`, 504, 'AI_TIMEOUT');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonStrict(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    throw new AIProviderError('Respons AI tidak berupa JSON valid.', 502, 'AI_INVALID_JSON');
  }
}

async function callProviderRawJSON(
  provider: AIProviderId,
  model: string,
  prompt: string,
  kind: 'quiz' | 'study_case',
  settings: AISettingsConfig
): Promise<unknown> {
  if (provider === 'gemini') {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new AIProviderError('GEMINI_API_KEY belum dikonfigurasi di server.', 503, 'AI_NOT_CONFIGURED');
    }
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const schema =
      kind === 'quiz'
        ? {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, enum: ['A', 'B', 'C', 'D'] },
                    text: { type: Type.STRING },
                  },
                  required: ['id', 'text'],
                },
              },
              correctOptionId: { type: Type.STRING, enum: ['A', 'B', 'C', 'D'] },
              explanation: { type: Type.STRING },
              sourceNotes: { type: Type.STRING },
            },
            required: ['topic', 'question', 'options', 'correctOptionId', 'explanation'],
          }
        : {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              context: { type: Type.STRING },
              task: { type: Type.STRING },
              keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
              expectedAnswerOutline: { type: Type.ARRAY, items: { type: Type.STRING } },
              judgingRubric: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    criterion: { type: Type.STRING },
                    description: { type: Type.STRING },
                    maxPoints: { type: Type.INTEGER },
                  },
                  required: ['criterion', 'description', 'maxPoints'],
                },
              },
              learningExplanation: { type: Type.STRING },
            },
            required: [
              'title',
              'context',
              'task',
              'keyConcepts',
              'expectedAnswerOutline',
              'judgingRubric',
              'learningExplanation',
            ],
          };

    const geminiModel = model.startsWith('gemini-') ? model : 'gemini-4-hydrogen';
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new AIProviderError(`Gemini timeout setelah ${settings.timeoutMs} ms`, 504, 'AI_TIMEOUT')),
        settings.timeoutMs
      )
    );

    const callPromise = ai.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        maxOutputTokens: settings.maxOutputTokens,
      },
    });

    const response = await Promise.race([callPromise, timeoutPromise]);
    return parseJsonStrict(response.text || '');
  }

  if (provider === 'openrouter') {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new AIProviderError('OPENROUTER_API_KEY belum dikonfigurasi di server.', 503, 'AI_NOT_CONFIGURED');
    }
    const res = await fetchWithTimeout(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || DEFAULT_MODELS_BY_PROVIDER.openrouter[0],
          response_format: { type: 'json_object' },
          max_tokens: settings.maxOutputTokens,
          messages: [
            { role: 'system', content: 'Return strictly valid JSON only matching the requested schema.' },
            { role: 'user', content: prompt },
          ],
        }),
      },
      settings.timeoutMs
    );
    if (!res.ok) {
      throw new AIProviderError(`OpenRouter error (${res.status})`, res.status === 429 ? 429 : 502);
    }
    const data: any = await res.json();
    return parseJsonStrict(data?.choices?.[0]?.message?.content || '');
  }

  if (provider === 'openai') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new AIProviderError('OPENAI_API_KEY belum dikonfigurasi di server.', 503, 'AI_NOT_CONFIGURED');
    }
    const res = await fetchWithTimeout(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || DEFAULT_MODELS_BY_PROVIDER.openai[0],
          response_format: { type: 'json_object' },
          max_tokens: settings.maxOutputTokens,
          messages: [
            { role: 'system', content: 'Return strictly valid JSON only.' },
            { role: 'user', content: prompt },
          ],
        }),
      },
      settings.timeoutMs
    );
    if (!res.ok) {
      throw new AIProviderError(`OpenAI error (${res.status})`, res.status === 429 ? 429 : 502);
    }
    const data: any = await res.json();
    return parseJsonStrict(data?.choices?.[0]?.message?.content || '');
  }

  // Anthropic Claude
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new AIProviderError('ANTHROPIC_API_KEY belum dikonfigurasi di server.', 503, 'AI_NOT_CONFIGURED');
  }
  const res = await fetchWithTimeout(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODELS_BY_PROVIDER.anthropic[0],
        max_tokens: settings.maxOutputTokens,
        messages: [{ role: 'user', content: `${prompt}\n\nRespond with strictly valid JSON only.` }],
      }),
    },
    settings.timeoutMs
  );
  if (!res.ok) {
    throw new AIProviderError(`Claude error (${res.status})`, res.status === 429 ? 429 : 502);
  }
  const data: any = await res.json();
  const text = data?.content?.find((c: any) => c.type === 'text')?.text || '';
  return parseJsonStrict(text);
}

async function executeWithFallback<T>(
  prompt: string,
  kind: 'quiz' | 'study_case',
  schema: z.ZodType<T>,
  overrideProvider?: AIProviderId,
  overrideModel?: string
): Promise<{ parsed: T; provider: AIProviderId; model: string }> {
  const settings = getAISettings();
  const primaryProvider = overrideProvider || settings.provider;
  const primaryModel = overrideModel || settings.model || DEFAULT_MODELS_BY_PROVIDER[primaryProvider][0];

  const attemptProvider = async (prov: AIProviderId, mdl: string) => {
    const raw = await callProviderRawJSON(prov, mdl, prompt, kind, settings);
    const result = schema.safeParse(raw);
    if (!result.success) {
      throw new AIProviderError(
        `Validasi skema AI gagal: ${result.error.issues.map((i) => i.message).join('; ')}`,
        502,
        'AI_SCHEMA_INVALID'
      );
    }
    return { parsed: result.data, provider: prov, model: mdl };
  };

  try {
    return await attemptProvider(primaryProvider, primaryModel);
  } catch (primaryErr) {
    if (
      settings.fallbackProvider &&
      settings.fallbackProvider !== 'none' &&
      settings.fallbackProvider !== primaryProvider
    ) {
      const fbProv = settings.fallbackProvider;
      const fbModel = DEFAULT_MODELS_BY_PROVIDER[fbProv][0];
      return await attemptProvider(fbProv, fbModel);
    }
    throw primaryErr;
  }
}

export async function generateFreshQuiz(params: {
  element?: ElementPromptContext;
  difficulty?: 'mudah' | 'sedang' | 'sulit';
  drawEventId?: string;
  gameId?: string;
  recentFingerprints?: string[];
  provider?: AIProviderId;
  model?: string;
  forceRegenerate?: boolean;
}): Promise<StoredQuizRecord> {
  const drawKey = params.drawEventId || `quiz_draw_${Date.now()}`;
  if (!params.forceRegenerate && drawCache.has(drawKey)) {
    const cached = drawCache.get(drawKey)!;
    if (cached.kind === 'quiz') return cached;
  }

  const diff = params.difficulty || activeAISettings.difficulty || 'sedang';
  const el = params.element;
  const elDesc = el
    ? `${el.nameId || el.nameEn} / ${el.nameEn || el.nameId} (Simbol: ${el.symbol}, Nomor Atom: ${el.atomicNumber}, Kategori: ${el.category || '-'}, Periode: ${el.period || '-'})`
    : 'Unsur Tabel Periodik secara umum';
  const zList = [el?.atomicNumber || 1];

  const basePrompt = `Anda adalah guru kimia SMA yang menyusun kartu soal game edukasi "PERIODIC TABLE MONOPOLY".
Buat 1 soal pilihan ganda BARU dan UNIK tentang: ${elDesc}.
Tingkat kesulitan: ${diff}.
Aturan wajib:
1. Fakta ilmiah akurat sesuai tabel periodik IUPAC, aman untuk pelajar SMA, hindari prosedur bahan berbahaya.
2. Konten fokus pada konsep sifat periodik, kegunaan industri/lingkungan/sehari-hari, konfigurasi elektron, atau ikatan kimia.
3. Sediakan TEPAT 4 opsi unik dengan id "A", "B", "C", "D" dan tepat 1 jawaban benar ("correctOptionId").
4. Sertakan penjelasan singkat ("explanation") dan catatan sumber konseptual ("sourceNotes").
5. Kembalikan JSON valid dalam Bahasa Indonesia.`;

  let generated = await executeWithFallback(
    basePrompt,
    'quiz',
    QuizGeneratedSchema,
    params.provider,
    params.model
  );

  let fp = computeFingerprint(generated.parsed.question, zList);
  const dupSet = new Set([...(params.recentFingerprints || []), ...Array.from(fingerprintSet)]);
  if (dupSet.has(fp)) {
    generated = await executeWithFallback(
      `${basePrompt}\nPENTING: Buat sudut pandang pertanyaan yang sepenuhnya berbeda agar tidak mengulang pertanyaan sebelumnya.`,
      'quiz',
      QuizGeneratedSchema,
      params.provider,
      params.model
    );
    fp = computeFingerprint(generated.parsed.question, zList);
  }

  const record: StoredQuizRecord = {
    id: `quiz_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    drawEventId: drawKey,
    kind: 'quiz',
    topic: generated.parsed.topic,
    difficulty: diff,
    relatedElements: zList,
    question: generated.parsed.question,
    options: generated.parsed.options,
    correctOptionId: generated.parsed.correctOptionId,
    explanation: generated.parsed.explanation,
    sourceNotes: generated.parsed.sourceNotes || 'IUPAC / Kurikulum Kimia SMA',
    fingerprint: fp,
    provider: generated.provider,
    model: generated.model,
    createdAt: Date.now(),
    verified: false,
    timeLimitSeconds: 30,
    gameId: params.gameId,
  };

  fingerprintSet.add(fp);
  quizStore.set(record.id, record);
  drawCache.set(drawKey, record);
  return record;
}

export async function generateFreshStudyCase(params: {
  element?: ElementPromptContext;
  difficulty?: 'mudah' | 'sedang' | 'sulit';
  drawEventId?: string;
  gameId?: string;
  recentFingerprints?: string[];
  provider?: AIProviderId;
  model?: string;
  forceRegenerate?: boolean;
}): Promise<StoredStudyCaseRecord> {
  const drawKey = params.drawEventId || `case_draw_${Date.now()}`;
  if (!params.forceRegenerate && drawCache.has(drawKey)) {
    const cached = drawCache.get(drawKey)!;
    if (cached.kind === 'study_case') return cached;
  }

  const diff = params.difficulty || activeAISettings.difficulty || 'sedang';
  const el = params.element;
  const elDesc = el
    ? `${el.nameId || el.nameEn} (${el.symbol}, Z=${el.atomicNumber})`
    : 'Unsur Industri dan Lingkungan';
  const zList = [el?.atomicNumber || 1];

  const basePrompt = `Anda adalah penyusun tantangan studi kasus kimia SMA untuk game "PERIODIC TABLE MONOPOLY".
Buat 1 studi kasus BARU bertema konseptual, industri hijau, baterai, katalis, lingkungan, atau aplikasi sehari-hari yang berfokus pada: ${elDesc}.
Tingkat kesulitan: ${diff}.
Aturan wajib:
1. Konteks aman untuk SMA, tidak memuat instruksi eksperimen berbahaya.
2. Kembalikan JSON berisi:
   - title: judul menarik
   - context: skenario masalah ilmiah/industri nyata
   - task: tugas presentasi/analisis tim
   - keyConcepts: 2-4 kata kunci konsep kimia
   - expectedAnswerOutline: 2-3 poin jawaban yang diharapkan penilai
   - judgingRubric: 2-4 kriteria ({ criterion, description, maxPoints })
   - learningExplanation: rangkuman jawaban ilmiah lengkap
Bahasa: Bahasa Indonesia.`;

  let generated = await executeWithFallback(
    basePrompt,
    'study_case',
    StudyCaseGeneratedSchema,
    params.provider,
    params.model
  );

  let fp = computeFingerprint(`${generated.parsed.title} ${generated.parsed.task}`, zList);
  const dupSet = new Set([...(params.recentFingerprints || []), ...Array.from(fingerprintSet)]);
  if (dupSet.has(fp)) {
    generated = await executeWithFallback(
      `${basePrompt}\nPENTING: Gunakan skenario industri atau lingkungan yang berbeda dari soal sebelumnya.`,
      'study_case',
      StudyCaseGeneratedSchema,
      params.provider,
      params.model
    );
    fp = computeFingerprint(`${generated.parsed.title} ${generated.parsed.task}`, zList);
  }

  const record: StoredStudyCaseRecord = {
    id: `case_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    drawEventId: drawKey,
    kind: 'study_case',
    title: generated.parsed.title,
    context: generated.parsed.context,
    task: generated.parsed.task,
    difficulty: diff,
    relatedElements: zList,
    keyConcepts: generated.parsed.keyConcepts,
    expectedAnswerOutline: generated.parsed.expectedAnswerOutline,
    judgingRubric: generated.parsed.judgingRubric,
    learningExplanation: generated.parsed.learningExplanation,
    fingerprint: fp,
    provider: generated.provider,
    model: generated.model,
    createdAt: Date.now(),
    verified: false,
    gameId: params.gameId,
  };

  fingerprintSet.add(fp);
  studyCaseStore.set(record.id, record);
  drawCache.set(drawKey, record);
  return record;
}

export async function testProviderConnection(
  provider: AIProviderId,
  model?: string
): Promise<{ ok: boolean; provider: AIProviderId; model: string; latencyMs: number; message: string }> {
  const started = Date.now();
  const targetModel = model || DEFAULT_MODELS_BY_PROVIDER[provider][0];
  try {
    await callProviderRawJSON(
      provider,
      targetModel,
      'Kembalikan JSON tepat dengan format {"topic":"Tes Koneksi Kimia","question":"Apa simbol kimia untuk Hidrogen?","options":[{"id":"A","text":"H"},{"id":"B","text":"He"},{"id":"C","text":"Li"},{"id":"D","text":"Be"}],"correctOptionId":"A","explanation":"Hidrogen bersimbol H."}',
      'quiz',
      { ...getAISettings(), timeoutMs: 12000 }
    );
    return {
      ok: true,
      provider,
      model: targetModel,
      latencyMs: Date.now() - started,
      message: `Koneksi ${provider} (${targetModel}) berhasil merespons dalam ${Date.now() - started} ms.`,
    };
  } catch (err: any) {
    return {
      ok: false,
      provider,
      model: targetModel,
      latencyMs: Date.now() - started,
      message: err?.message || `Gagal terhubung ke ${provider}.`,
    };
  }
}

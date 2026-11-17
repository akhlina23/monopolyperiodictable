# AI Providers & Educational Generation Architecture

## 1. Server-Only Provider Abstraction (`server/aiProviders.ts`)
All LLM requests run strictly on the Node.js server—never from browser bundles. API keys are supplied exclusively through server environment Secrets:
- `GEMINI_API_KEY` — Google Gemini via official `@google/genai` SDK (`gemini-4-hydrogen` default, `gemini-4-argon` available)
- `OPENROUTER_API_KEY` — OpenRouter Chat Completions endpoint
- `ANTHROPIC_API_KEY` — Anthropic Messages API
- `OPENAI_API_KEY` — OpenAI Chat Completions endpoint

## 2. Runtime Guarantees
- **Fresh Generation**: Every quiz/study-case draw generates a new question validated via Zod schemas (`QuizSchema`, `StudyCaseSchema`).
- **Similarity & Fingerprint Deduplication**: Fingerprints (`normalize(question/title + element)`) prevent duplicate repeats within active gameplay.
- **Idempotency per Draw Event**: Passing `drawEventId` guarantees page refreshes/reconnects return the exact cached card for that draw rather than consuming another API call.
- **Hidden Answer Key Until Lock**:
  - `POST /api/ai/quiz` returns question + 4 shuffled/unique options **without** `correctOptionId` or `explanation`. Verification happens via `POST /api/ai/quiz/submit` once the player selects an answer or timer expires.
  - `POST /api/ai/study-case` strips `expectedAnswerOutline` and detailed rubric guidance from the initial presenter payload; peer evaluation reveals rubric criteria cleanly when voting opens.
- **Zero-Penalty Failure Policy**: If provider calls fail, time out, or hit rate limits, the API returns an explicit structured error (`502/504/429`) and **never** increments `quizFailures`, increments `studyCaseFailures`, deducts KK, or silently swaps in stale static cards. Players are shown Retry and Cancel/Return options.

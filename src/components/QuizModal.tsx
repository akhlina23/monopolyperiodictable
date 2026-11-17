import React, { useEffect, useRef, useState } from 'react';
import { GeneratedQuizData } from '../types/game';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Timer, X, XCircle } from 'lucide-react';
import { safeFetchJson } from '../utils/apiClient';

interface QuizModalProps {
  quiz: GeneratedQuizData | null;
  quizDeadline?: number | null;
  isLoading: boolean;
  errorMessage: string | null;
  rewardKK: number;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onRestoreOnTimeout?: () => void;
  onRetryGenerate: () => void;
  onCancelNoPenalty: () => void;
  onQuizResolved: (isCorrect: boolean) => void;
  timeLimitSeconds?: number;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  quiz,
  quizDeadline = null,
  isLoading,
  errorMessage,
  rewardKK,
  isMinimized = false,
  onMinimize,
  onRestoreOnTimeout,
  onRetryGenerate,
  onCancelNoPenalty,
  onQuizResolved,
  timeLimitSeconds = 30,
}) => {
  const getInitialTimeLeft = () => {
    if (quizDeadline && Number.isFinite(quizDeadline)) {
      return Math.max(0, Math.ceil((quizDeadline - Date.now()) / 1000));
    }
    return quiz?.timeLimitSeconds || timeLimitSeconds;
  };

  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft);
  const [selectedId, setSelectedId] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradeResult, setGradeResult] = useState<{
    isCorrect: boolean;
    correctOptionId?: 'A' | 'B' | 'C' | 'D';
    explanation?: string;
  } | null>(null);

  const lockedRef = useRef(false);

  // Reset local state whenever a new quiz card arrives
  useEffect(() => {
    setTimeLeft(getInitialTimeLeft());
    setSelectedId(null);
    setIsLocked(false);
    setIsSubmitting(false);
    setGradeResult(null);
    lockedRef.current = false;
  }, [quiz?.id, timeLimitSeconds]);

  const submitAnswerToServer = async (optionId: 'A' | 'B' | 'C' | 'D' | null, timedOut: boolean) => {
    if (!quiz || lockedRef.current) return;
    lockedRef.current = true;
    setSelectedId(optionId);
    setIsLocked(true);
    setIsSubmitting(true);

    try {
      const result = await safeFetchJson<{
        isCorrect?: boolean;
        correctOptionId?: 'A' | 'B' | 'C' | 'D';
        explanation?: string;
      }>('/api/ai/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz.id,
          selectedOptionId: optionId,
          timedOut,
        }),
      });
      if (result.ok && result.data) {
        const data = result.data;
        setGradeResult({
          isCorrect: !!data.isCorrect,
          correctOptionId: data.correctOptionId,
          explanation: data.explanation,
        });
        setIsSubmitting(false);
        setTimeout(() => {
          onQuizResolved(!!data.isCorrect);
        }, 1800);
        return;
      }
    } catch {
      // Fallback only if local offline quiz already contains key (never during live server AI)
    }

    const fallbackCorrect = quiz.correctOptionId ? !timedOut && optionId === quiz.correctOptionId : false;
    setGradeResult({
      isCorrect: fallbackCorrect,
      correctOptionId: quiz.correctOptionId,
      explanation: quiz.explanation || 'Evaluasi selesai.',
    });
    setIsSubmitting(false);
    setTimeout(() => {
      onQuizResolved(fallbackCorrect);
    }, 1800);
  };

  // Run deadline-synced countdown even while modal is minimized so timer never resets
  useEffect(() => {
    if (!quiz || isLoading || errorMessage || isLocked) return;

    const updateFromDeadline = () => {
      if (quizDeadline && Number.isFinite(quizDeadline)) {
        const remaining = Math.max(0, Math.ceil((quizDeadline - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0 && !lockedRef.current) {
          onRestoreOnTimeout?.();
          submitAnswerToServer(null, true);
        }
        return remaining;
      }
      return null;
    };

    if (quizDeadline && Number.isFinite(quizDeadline)) {
      const initial = updateFromDeadline();
      if (initial === 0) return;
      const timer = setInterval(() => {
        const rem = updateFromDeadline();
        if (rem === 0) clearInterval(timer);
      }, 250);
      return () => clearInterval(timer);
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onRestoreOnTimeout?.();
          submitAnswerToServer(null, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz?.id, quizDeadline, isLoading, errorMessage, isLocked]);

  return (
    <div
      className={
        isMinimized
          ? 'hidden'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-[#09090D]/85 p-4'
      }
    >
      <div className="bg-[#171820] border border-[#FF8733]/50 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        <div className="bg-[#20222D] border-b border-white/10 p-4 flex justify-between items-center gap-3">
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#FF8733] font-bold">
              Dynamic AI Flashcard Quiz {quiz?.provider ? `· ${quiz.provider.toUpperCase()}` : ''}
            </span>
            <h2 className="font-display text-base font-bold text-[#F4F1EA] mt-0.5 truncate">
              {isLoading
                ? 'Menyusun Pertanyaan Kimia AI...'
                : errorMessage
                ? 'Layanan AI Tidak Tersedia'
                : quiz?.topic || 'Chemistry Flashcard Quiz'}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {quiz && !isLoading && !errorMessage && (
              <div className="flex items-center gap-1.5 bg-[#09090D] border border-white/10 px-3 py-1.5 rounded-xl font-mono text-sm font-bold text-[#FF8733] tabular-nums whitespace-nowrap">
                <Timer className="w-4 h-4" />
                <span>{timeLeft}s</span>
              </div>
            )}
            {onMinimize && (
              <button
                type="button"
                disabled={isLocked}
                onClick={onMinimize}
                aria-label="Tutup sementara untuk memeriksa papan"
                title="Tutup sementara untuk melihat papan atau kartu unsur"
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#09090D] hover:bg-[#2C2F3D] disabled:opacity-40 border border-white/15 text-[#F4F1EA] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <span className="hidden sm:inline">Tutup Sementara</span>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {isLoading && (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <Loader2 className="w-8 h-8 text-[#7029FF] animate-spin" />
              <p className="text-xs text-[#A6A9B7]">
                Menghasilkan soal kimia baru yang tervalidasi (timer 30 detik dimulai setelah soal siap)...
              </p>
            </div>
          )}

          {!isLoading && errorMessage && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#3B161B] border border-[#F45B69]/60 text-xs text-[#FCA5A5] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Gagal Mengambil Kuis AI (Tanpa Penalti)</div>
                  <div className="mt-1 opacity-90">{errorMessage}</div>
                  <div className="mt-1.5 text-[11px] text-[#F4F1EA]/80">
                    Sesuai aturan, kegagalan API AI tidak menambah hitungan kegagalan kuis atau mengurangi KK Anda.
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onRetryGenerate}
                  className="flex-1 py-2.5 rounded-xl bg-[#7029FF] hover:bg-[#5E1FE0] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
                </button>
                <button
                  type="button"
                  onClick={onCancelNoPenalty}
                  className="flex-1 py-2.5 rounded-xl bg-[#20222D] hover:bg-[#2C2F3D] border border-white/15 text-[#F4F1EA] font-bold text-xs cursor-pointer"
                >
                  Lewati Tanpa Penalti
                </button>
              </div>
            </div>
          )}

          {!isLoading && !errorMessage && quiz && (
            <>
              <p className="text-sm font-medium text-[#F4F1EA] leading-relaxed">{quiz.question}</p>

              <div className="grid grid-cols-1 gap-2">
                {quiz.options.map((opt) => {
                  const isThisSelected = selectedId === opt.id;
                  let optionStyle =
                    'bg-[#20222D] border-white/10 hover:border-[#286BFF] text-[#F4F1EA]';

                  if (isLocked && gradeResult) {
                    if (opt.id === gradeResult.correctOptionId) {
                      optionStyle = 'bg-[#14291D] border-[#32C48D] text-[#86EFAC] font-bold';
                    } else if (isThisSelected) {
                      optionStyle = 'bg-[#3B161B] border-[#F45B69] text-[#FCA5A5] font-bold';
                    } else {
                      optionStyle = 'bg-[#171820] border-white/5 text-[#A6A9B7] opacity-55';
                    }
                  } else if (isThisSelected) {
                    optionStyle = 'bg-[#152238] border-[#286BFF] text-white';
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => submitAnswerToServer(opt.id, false)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${optionStyle}`}
                    >
                      <span className="w-6 h-6 rounded-md bg-[#09090D] border border-white/15 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        {opt.id}
                      </span>
                      <span className="text-xs leading-relaxed">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {isSubmitting && (
                <div className="text-xs text-[#A6A9B7] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#286BFF]" />
                  Memeriksa kunci jawaban di server...
                </div>
              )}

              {gradeResult && (
                <div
                  className={`p-3.5 rounded-xl border flex flex-col gap-1 text-xs ${
                    gradeResult.isCorrect
                      ? 'bg-[#14291D] border-[#32C48D] text-[#86EFAC]'
                      : 'bg-[#3B161B] border-[#F45B69] text-[#FCA5A5]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {gradeResult.isCorrect ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Benar! Hadiah +{rewardKK.toLocaleString('id-ID')} KK diberikan.</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Salah / Waktu Habis (+1 Gagal Quiz, 7× gagal = Bangkrut)</span>
                      </>
                    )}
                  </div>
                  {gradeResult.explanation && (
                    <p className="text-[11px] mt-1 text-[#F4F1EA]/90 leading-normal">
                      {gradeResult.explanation}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { GeneratedStudyCaseData, Team } from '../types/game';
import {
  AlertOctagon,
  AlertTriangle,
  Award,
  HelpCircle,
  Loader2,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';

interface StudyCaseModalProps {
  studyCase: GeneratedStudyCaseData | null;
  isLoading: boolean;
  errorMessage: string | null;
  rewardKK: number;
  activeTeam: Team;
  otherTeams: Team[];
  isMinimized?: boolean;
  onMinimize?: () => void;
  onRetryGenerate: () => void;
  onCancelNoPenalty: () => void;
  onComplete: (isApproved: boolean) => void;
}

export const StudyCaseModal: React.FC<StudyCaseModalProps> = ({
  studyCase,
  isLoading,
  errorMessage,
  rewardKK,
  activeTeam,
  otherTeams,
  isMinimized = false,
  onMinimize,
  onRetryGenerate,
  onCancelNoPenalty,
  onComplete,
}) => {
  const [votes, setVotes] = useState<Record<string, 'approve' | 'reject'>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [stage, setStage] = useState<'presenting' | 'evaluating'>('presenting');
  const [rubricGuide, setRubricGuide] = useState<{
    expectedAnswerOutline?: string[];
    learningExplanation?: string;
  } | null>(null);

  useEffect(() => {
    setVotes({});
    setHasSubmitted(false);
    setStage('presenting');
    setRubricGuide(null);
  }, [studyCase?.id]);

  const handleVote = (teamId: string, decision: 'approve' | 'reject') => {
    setVotes((prev) => ({ ...prev, [teamId]: decision }));
  };

  const handleOpenPeerEvaluation = async () => {
    setStage('evaluating');
    if (studyCase?.id) {
      try {
        const res = await fetch('./api/ai/study-case/rubric-guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId: studyCase.id }),
        });
        if (res.ok) {
          const data = await res.json();
          setRubricGuide(data);
        }
      } catch {
        // Ignore if already provided
      }
    }
  };

  const allVoted = otherTeams.every((t) => votes[t.id]);
  const approveCount = Object.values(votes).filter((v) => v === 'approve').length;
  const isApproved = approveCount >= Math.ceil(Math.max(1, otherTeams.length) / 2);

  const handleSubmitVotes = () => {
    setHasSubmitted(true);
    setTimeout(() => {
      onComplete(isApproved);
    }, 1500);
  };

  return (
    <div
      className={
        isMinimized
          ? 'hidden'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-[#09090D]/85 p-4'
      }
    >
      <div className="bg-[#171820] border border-[#7029FF]/60 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#20222D] border-b border-white/10 p-4 flex justify-between items-center gap-3">
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#D8B4FE] font-bold">
              Dynamic AI Study Case Challenge {studyCase?.provider ? `· ${studyCase.provider.toUpperCase()}` : ''}
            </span>
            <h2 className="font-display text-base font-bold text-[#F4F1EA] mt-0.5 truncate">
              {isLoading
                ? 'Menyusun Studi Kasus Kimia AI...'
                : errorMessage
                ? 'Layanan AI Tidak Tersedia'
                : studyCase?.title || 'Chemistry Study Case'}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <HelpCircle className="w-5 h-5 text-[#7029FF] hidden sm:block" />
            {onMinimize && (
              <button
                type="button"
                disabled={hasSubmitted}
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

        <div className="p-5 flex flex-col gap-3.5 overflow-y-auto text-xs">
          {isLoading && (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <Loader2 className="w-8 h-8 text-[#7029FF] animate-spin" />
              <p className="text-xs text-[#A6A9B7]">Menghasilkan studi kasus kimia dinamis via server AI...</p>
            </div>
          )}

          {!isLoading && errorMessage && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#3B161B] border border-[#F45B69]/60 text-xs text-[#FCA5A5] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Gagal Mengambil Studi Kasus AI (Tanpa Penalti)</div>
                  <div className="mt-1 opacity-90">{errorMessage}</div>
                  <div className="mt-1.5 text-[11px] text-[#F4F1EA]/80">
                    Kegagalan API AI tidak menambah hitungan gagal studi kasus dan tidak mengirim tim ke penjara.
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

          {!isLoading && !errorMessage && studyCase && (
            <>
              <div className="bg-[#20222D] border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: activeTeam.color }} />
                <div className="text-[#A6A9B7]">
                  Presenter: <strong className="text-[#F4F1EA]">{activeTeam.name}</strong>. Presentasikan analisis
                  Anda sebelum tim lawan membuka rubrik penilai.
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A6A9B7]">
                  Problem Context
                </h3>
                <p className="text-xs text-[#F4F1EA] leading-relaxed mt-1 bg-[#20222D] p-3 rounded-xl border border-white/10">
                  {studyCase.context}
                </p>
              </div>

              <div>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#286BFF]">
                  Analysis Task
                </h3>
                <p className="text-xs font-semibold text-[#F4F1EA] mt-1 bg-[#152238] p-3 rounded-xl border border-[#294E8A]">
                  {studyCase.task}
                </p>
              </div>

              {stage === 'presenting' ? (
                <button
                  type="button"
                  onClick={handleOpenPeerEvaluation}
                  className="w-full py-2.5 rounded-xl bg-[#286BFF] hover:bg-[#1D57DC] text-white font-bold text-xs cursor-pointer"
                >
                  Presentasi Selesai → Buka Penilaian Tim Lawan
                </button>
              ) : (
                <>
                  {studyCase.judgingRubric?.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A6A9B7]">
                        Judging Rubric (Evaluasi Lawan)
                      </h3>
                      {studyCase.judgingRubric.map((r, i) => (
                        <div
                          key={i}
                          className="bg-[#20222D] p-2.5 rounded-lg border border-white/10 flex justify-between gap-2"
                        >
                          <span className="font-semibold text-[#F4F1EA]">{r.criterion}</span>
                          <span className="text-[#A6A9B7] text-right">{r.description}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {rubricGuide?.expectedAnswerOutline && rubricGuide.expectedAnswerOutline.length > 0 && (
                    <div className="bg-[#14291D]/60 border border-[#32C48D]/40 rounded-xl p-3 space-y-1">
                      <div className="font-mono text-[10px] uppercase font-bold text-[#86EFAC]">
                        Panduan Jawaban Penilai (Server Guide)
                      </div>
                      <ul className="list-disc list-inside text-[11px] text-[#F4F1EA]/90 space-y-0.5">
                        {rubricGuide.expectedAnswerOutline.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!hasSubmitted ? (
                    <div className="border-t border-white/10 pt-3">
                      <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A6A9B7] mb-2">
                        Opponent Peer Votes (Majority Required):
                      </h4>
                      <div className="space-y-2">
                        {otherTeams.map((team) => (
                          <div
                            key={team.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-[#20222D]"
                          >
                            <div className="flex items-center gap-2">
                              <span style={{ backgroundColor: team.color }} className="w-3 h-3 rounded-full" />
                              <span className="font-bold text-[#F4F1EA]">{team.name}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleVote(team.id, 'approve')}
                                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 border cursor-pointer ${
                                  votes[team.id] === 'approve'
                                    ? 'bg-[#32C48D] text-[#09090D] border-[#32C48D]'
                                    : 'bg-[#09090D] text-[#86EFAC] border-white/15 hover:border-[#32C48D]'
                                }`}
                              >
                                <ThumbsUp className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVote(team.id, 'reject')}
                                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 border cursor-pointer ${
                                  votes[team.id] === 'reject'
                                    ? 'bg-[#F45B69] text-white border-[#F45B69]'
                                    : 'bg-[#09090D] text-[#FCA5A5] border-white/15 hover:border-[#F45B69]'
                                }`}
                              >
                                <ThumbsDown className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={!allVoted}
                        onClick={handleSubmitVotes}
                        className="w-full mt-3 py-2.5 rounded-xl bg-[#7029FF] hover:bg-[#5E1FE0] disabled:opacity-45 text-white font-bold text-xs cursor-pointer"
                      >
                        Submit Verdict ({approveCount}/{otherTeams.length} Approve)
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`p-4 rounded-xl border text-center flex flex-col items-center gap-1.5 ${
                        isApproved
                          ? 'bg-[#14291D] border-[#32C48D] text-[#86EFAC]'
                          : 'bg-[#3B161B] border-[#F45B69] text-[#FCA5A5]'
                      }`}
                    >
                      {isApproved ? (
                        <>
                          <Award className="w-7 h-7" />
                          <div className="font-bold text-sm">
                            Case Approved! +{rewardKK.toLocaleString('id-ID')} KK &amp; +1 Jail Free Card
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertOctagon className="w-7 h-7" />
                          <div className="font-bold text-sm">
                            Case Rejected! Sent to Jail (+1 Failure, 3 = Bankrupt)
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

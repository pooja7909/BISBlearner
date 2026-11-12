import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Lightbulb,
  Lock,
  LockOpen,
  RotateCcw,
  SkipForward,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import type { EscapePayload } from '../../types.ts';
import { speakText } from '../../utils/speech.ts';
import { soundtrack } from '../../utils/soundtrack.ts';

interface EscapePlayerProps {
  payload: EscapePayload;
  boardMode: boolean;
  largeType: boolean;
  readAloudEnabled: boolean;
  onProgress?: (score: number, total: number, completed: boolean, summary: string) => void;
}

export function EscapePlayer({
  payload,
  boardMode,
  largeType,
  readAloudEnabled,
  onProgress,
}: EscapePlayerProps) {
  const [stageIdx, setStageIdx] = useState(0);
  const [unlockedDigits, setUnlockedDigits] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [retryFeedback, setRetryFeedback] = useState<string | null>(null);

  const totalStages = payload.stages.length;
  const isEscaped = totalStages > 0 && unlockedDigits.length === totalStages;
  const currentStage = payload.stages[stageIdx];

  useEffect(() => {
    setStageIdx(0);
    setUnlockedDigits([]);
    setSelectedOption(null);
    setShowHint(false);
    setRetryFeedback(null);
  }, [payload.stages]);

  useEffect(() => {
    onProgress?.(
      unlockedDigits.length,
      totalStages,
      isEscaped,
      isEscaped
        ? `Vault Unlocked (${unlockedDigits.join('-')})`
        : `Cracked ${unlockedDigits.length}/${totalStages} locks`
    );
  }, [unlockedDigits, totalStages, isEscaped, onProgress]);

  function handleOptionClick(idx: number) {
    if (!currentStage || isEscaped) return;
    setSelectedOption(idx);

    if (idx === currentStage.correctIndex) {
      setRetryFeedback(null);
      const nextDigits = [...unlockedDigits, currentStage.codeDigit];
      setUnlockedDigits(nextDigits);

      if (nextDigits.length === totalStages) {
        soundtrack.playUnlockFanfare();
        if (readAloudEnabled) {
          speakText(`Vault unlocked! The full code is ${nextDigits.join(' ')}.`);
        }
      } else {
        soundtrack.playCorrectChime();
        if (readAloudEnabled) {
          speakText(`Lock cracked! Digit ${currentStage.codeDigit} unlocked.`);
        }
      }
    } else {
      setRetryFeedback('Not that code! Check the clue or use the Hint button and try again.');
    }
  }

  function handleNextLock() {
    setStageIdx((i) => Math.min(totalStages - 1, i + 1));
    setSelectedOption(null);
    setShowHint(false);
    setRetryFeedback(null);
  }

  function handleSkipLock() {
    if (!currentStage || isEscaped) return;
    const nextDigits = [...unlockedDigits, '—'];
    setUnlockedDigits(nextDigits);
    setSelectedOption(null);
    setShowHint(false);
    setRetryFeedback(null);
    if (stageIdx + 1 < totalStages) {
      setStageIdx((i) => i + 1);
    }
  }

  function handleReset() {
    setStageIdx(0);
    setUnlockedDigits([]);
    setSelectedOption(null);
    setShowHint(false);
    setRetryFeedback(null);
  }

  const stageSolved = unlockedDigits.length > stageIdx;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <p className="text-sm text-slate-700 max-w-2xl">{payload.storyIntro}</p>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[38px] shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restart Challenge
        </button>
      </div>

      {/* Vault Combination Display */}
      <div className="rounded-xl border border-slate-200 bg-slate-900 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {isEscaped ? (
              <LockOpen className="h-5 w-5 text-emerald-400" />
            ) : (
              <Lock className="h-5 w-5 text-blue-400" />
            )}
            <span className="font-display text-base font-semibold">
              {isEscaped ? 'Vault Combination Unlocked' : 'Vault Combination Progress'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {payload.stages.map((st, idx) => {
              const digit = unlockedDigits[idx];
              return (
                <div
                  key={st.id}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border font-mono text-xl font-bold tabular-nums ${
                    digit
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : idx === stageIdx
                      ? 'border-blue-400 bg-blue-500/20 text-blue-200'
                      : 'border-slate-700 bg-slate-800 text-slate-500'
                  }`}
                >
                  {digit || '?'}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isEscaped ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <KeyRound className="h-7 w-7 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h3 className="font-display text-2xl font-semibold text-emerald-950">
                Code Cracked: {unlockedDigits.join(' – ')}
              </h3>
              <p className="text-sm text-emerald-900">
                You solved all {totalStages} curriculum puzzles and unlocked the vault!
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {payload.stages.map((st) => (
              <div
                key={st.id}
                className="rounded-xl border border-emerald-200 bg-white p-3.5 text-xs text-slate-700"
              >
                <p className="font-semibold text-slate-950">
                  {st.stageTitle} · Digit {st.codeDigit}
                </p>
                <p className="mt-1">{st.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        currentStage && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                {currentStage.stageTitle} ({stageIdx + 1} of {totalStages})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => speakText(currentStage.riddle)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[36px]"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  Read Riddle
                </button>
                <button
                  type="button"
                  onClick={() => setShowHint((h) => !h)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[36px]"
                >
                  <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                  {showHint ? 'Hide Hint' : 'Hint'}
                </button>
                {!stageSolved && (
                  <button
                    type="button"
                    onClick={handleSkipLock}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[36px] whitespace-nowrap"
                  >
                    <SkipForward className="h-3.5 w-3.5 text-slate-500" />
                    Skip Lock
                  </button>
                )}
              </div>
            </div>

            <h3
              className={`font-display font-semibold text-slate-950 ${
                boardMode || largeType ? 'text-2xl' : 'text-xl'
              }`}
            >
              {currentStage.riddle}
            </h3>

            {showHint && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-950">
                <strong>Hint:</strong> {currentStage.hint}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentStage.options.map((opt, idx) => {
                const isSolvedRight = stageSolved && idx === currentStage.correctIndex;
                const isWrongAttempt =
                  !stageSolved && selectedOption === idx && idx !== currentStage.correctIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={stageSolved}
                    onClick={() => handleOptionClick(idx)}
                    className={`rounded-xl border p-4 text-left font-medium transition-all min-h-[54px] ${
                      boardMode || largeType ? 'text-lg' : 'text-sm'
                    } ${
                      isSolvedRight
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                        : isWrongAttempt
                        ? 'border-amber-300 bg-amber-50 text-amber-950'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-blue-500 hover:bg-blue-50/40'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {retryFeedback && !stageSolved && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-950">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                <span>{retryFeedback}</span>
              </div>
            )}

            {stageSolved && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-2.5 text-emerald-950">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">
                      Lock Cracked — Vault Digit: {currentStage.codeDigit}
                    </p>
                    <p className="mt-0.5 text-emerald-900">{currentStage.explanation}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNextLock}
                  className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 min-h-[42px] whitespace-nowrap shrink-0"
                >
                  Next Lock →
                </button>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

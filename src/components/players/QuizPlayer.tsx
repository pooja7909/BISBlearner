import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  RotateCcw,
  SkipForward,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import type { QuizPayload } from '../../types.ts';
import { speakText } from '../../utils/speech.ts';

interface QuizPlayerProps {
  payload: QuizPayload;
  boardMode: boolean;
  largeType: boolean;
  readAloudEnabled: boolean;
  onProgress?: (score: number, total: number, completed: boolean, summary: string) => void;
  onAwardTeamPoint?: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export function QuizPlayer({
  payload,
  boardMode,
  largeType,
  readAloudEnabled,
  onProgress,
  onAwardTeamPoint,
}: QuizPlayerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = payload.questions.length;
  const question = payload.questions[currentIdx];

  useEffect(() => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setEliminatedIndices([]);
    setShowHint(false);
    setCorrectCount(0);
    setAnsweredCount(0);
    setSkippedCount(0);
    setFinished(false);
  }, [payload.questions]);

  useEffect(() => {
    onProgress?.(
      correctCount,
      total,
      finished,
      finished
        ? `Scored ${correctCount} / ${total}`
        : `Question ${Math.min(currentIdx + 1, total)} of ${total}`
    );
  }, [correctCount, total, finished, currentIdx, onProgress]);

  function handleSelectOption(idx: number) {
    if (!question || selectedOption !== null || eliminatedIndices.includes(idx)) return;
    setSelectedOption(idx);
    setAnsweredCount((c) => c + 1);
    const isCorrect = idx === question.correctIndex;
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
    }
    if (readAloudEnabled) {
      speakText(
        isCorrect
          ? `Correct! ${question.explanation}`
          : `Not quite. The best answer is ${question.options[question.correctIndex]}. ${question.explanation}`
      );
    }
  }

  function handleFiftyFifty() {
    if (!question || selectedOption !== null || eliminatedIndices.length > 0) return;
    const wrongIndices = question.options
      .map((_, i) => i)
      .filter((i) => i !== question.correctIndex);
    const toRemove = wrongIndices.slice(0, 2);
    setEliminatedIndices(toRemove);
    setShowHint(true);
  }

  function handleNext() {
    if (currentIdx + 1 >= total) {
      setFinished(true);
      return;
    }
    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    setSelectedOption(null);
    setEliminatedIndices([]);
    setShowHint(false);
    if (readAloudEnabled && payload.questions[nextIdx]) {
      speakText(payload.questions[nextIdx].prompt);
    }
  }

  function handleSkipQuestion() {
    if (!question || selectedOption !== null) return;
    setSkippedCount((s) => s + 1);
    handleNext();
  }

  function handleReset() {
    setCurrentIdx(0);
    setSelectedOption(null);
    setEliminatedIndices([]);
    setShowHint(false);
    setCorrectCount(0);
    setAnsweredCount(0);
    setSkippedCount(0);
    setFinished(false);
  }

  if (!question) {
    return <p className="text-sm text-slate-500">No questions in this activity.</p>;
  }

  if (finished) {
    return (
      <div className="space-y-6 py-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-7 w-7 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-display text-2xl font-semibold text-emerald-950">
                Class Check Complete
              </h3>
              <p className="text-base text-emerald-900 tabular-nums">
                Score: <strong>{correctCount}</strong> out of <strong>{total}</strong> questions answered accurately
                {skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}.
              </p>
              <p className="text-sm text-emerald-800">
                Ask students which question surprised them most or made them rethink an assumption.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors min-h-[44px]"
            >
              <RotateCcw className="h-4 w-4" />
              Run Quiz Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAnswered = selectedOption !== null;
  const isCorrectAnswer = selectedOption === question.correctIndex;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500 tabular-nums">
          <span className="font-semibold text-slate-900">
            Question {currentIdx + 1} of {total}
          </span>
          <span aria-hidden="true">·</span>
          <span>Level: {question.tier}</span>
          <span aria-hidden="true">·</span>
          <span>
            Score: {correctCount}/{answeredCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              speakText(
                `${question.prompt}. Options: ${question.options
                  .map((o, i) => `${OPTION_LETTERS[i]}: ${o}`)
                  .join('. ')}`
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px] whitespace-nowrap"
          >
            <Volume2 className="h-3.5 w-3.5" />
            Read Question
          </button>
          {!isAnswered && (
            <>
              <button
                type="button"
                disabled={eliminatedIndices.length > 0}
                onClick={handleFiftyFifty}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[40px] whitespace-nowrap"
              >
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                50/50 + Hint
              </button>
              <button
                type="button"
                onClick={handleSkipQuestion}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px] whitespace-nowrap"
              >
                <SkipForward className="h-3.5 w-3.5 text-slate-500" />
                Skip Question
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <h3
          className={`font-display font-semibold text-slate-950 leading-snug ${
            boardMode || largeType ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
          }`}
        >
          {question.prompt}
        </h3>

        {showHint && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-sm text-amber-950">
            <HelpCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              <strong>Hint:</strong> {question.hint}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((opt, idx) => {
            const isEliminated = eliminatedIndices.includes(idx);
            const isChosen = selectedOption === idx;
            const isRight = idx === question.correctIndex;

            let cardStyle =
              'border-slate-200 bg-white text-slate-900 hover:border-blue-500 hover:bg-blue-50/40';
            if (isEliminated) {
              cardStyle = 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed';
            } else if (isAnswered) {
              if (isRight) {
                cardStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500';
              } else if (isChosen) {
                cardStyle = 'border-red-400 bg-red-50 text-red-950';
              } else {
                cardStyle = 'border-slate-200 bg-slate-50/60 text-slate-500';
              }
            }

            return (
              <button
                key={`${question.id}-opt-${idx}`}
                type="button"
                disabled={isAnswered || isEliminated}
                onClick={() => handleSelectOption(idx)}
                className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all min-h-[60px] ${cardStyle}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-white/70 font-mono text-sm font-semibold">
                  {OPTION_LETTERS[idx]}
                </span>
                <span
                  className={`font-medium leading-snug ${
                    boardMode || largeType ? 'text-lg' : 'text-base'
                  }`}
                >
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isAnswered && (
        <div className="space-y-4 border-t border-slate-200 pt-5">
          <div
            className={`rounded-xl border p-4 ${
              isCorrectAnswer
                ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                : 'border-amber-200 bg-amber-50/70 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {isCorrectAnswer ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5">
                <p className="text-sm font-semibold">
                  {isCorrectAnswer
                    ? 'Accurate Reasoning'
                    : `Best Answer: ${OPTION_LETTERS[question.correctIndex]} — ${
                        question.options[question.correctIndex]
                      }`}
                </p>
                <p className={boardMode || largeType ? 'text-base' : 'text-sm'}>
                  {question.explanation}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-start gap-2.5">
              <MessageSquare className="h-4 w-4 text-blue-700 shrink-0 mt-1" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Class Talk Prompt
                </p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {question.discussionPrompt}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {boardMode && onAwardTeamPoint && (
                <button
                  type="button"
                  onClick={onAwardTeamPoint}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 min-h-[40px] whitespace-nowrap"
                >
                  +1 Team Point
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors min-h-[44px] whitespace-nowrap"
              >
                {currentIdx + 1 >= total ? 'Finish Round' : 'Next Question'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

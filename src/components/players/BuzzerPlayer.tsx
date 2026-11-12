import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  SkipForward,
  Trophy,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import type { BuzzerPayload, BuzzerQuestion } from '../../types.ts';
import { speakText } from '../../utils/speech.ts';
import { soundtrack } from '../../utils/soundtrack.ts';

interface BuzzerPlayerProps {
  payload: BuzzerPayload;
  boardMode: boolean;
  largeType: boolean;
  readAloudEnabled: boolean;
  onProgress?: (score: number, total: number, completed: boolean, summary: string) => void;
  onAwardSpecificPoints?: (points: number) => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export function BuzzerPlayer({
  payload,
  boardMode,
  largeType,
  readAloudEnabled,
  onProgress,
  onAwardSpecificPoints,
}: BuzzerPlayerProps) {
  const [solvedIds, setSolvedIds] = useState<Record<string, boolean>>({});
  const [activeTile, setActiveTile] = useState<{
    catName: string;
    question: BuzzerQuestion;
  } | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timerLimit, setTimerLimit] = useState<number>(30);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);

  const totalQuestions = payload.categories.reduce(
    (sum, cat) => sum + cat.questions.length,
    0
  );
  const completedCount = Object.keys(solvedIds).length;
  const allCleared = totalQuestions > 0 && completedCount === totalQuestions;

  useEffect(() => {
    setSolvedIds({});
    setActiveTile(null);
    setSelectedOption(null);
    setScore(0);
  }, [payload.categories]);

  useEffect(() => {
    onProgress?.(
      score,
      totalQuestions * 200,
      allCleared,
      allCleared
        ? `Cleared board (${score} pts)`
        : `${completedCount}/${totalQuestions} tiles · ${score} pts`
    );
  }, [score, completedCount, totalQuestions, allCleared, onProgress]);

  useEffect(() => {
    if (!activeTile || selectedOption !== null || timerLimit === 0) return;
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          soundtrack.playTimerBell();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeTile, selectedOption, timerLimit, secondsLeft]);

  function openTile(catName: string, q: BuzzerQuestion) {
    if (solvedIds[q.id]) return;
    setActiveTile({ catName, question: q });
    setSelectedOption(null);
    setSecondsLeft(timerLimit);
    if (readAloudEnabled) {
      speakText(`${catName} for ${q.points} points. ${q.prompt}`);
    }
  }

  function handleAnswer(idx: number) {
    if (!activeTile || selectedOption !== null) return;
    setSelectedOption(idx);
    const isRight = idx === activeTile.question.correctIndex;
    setSolvedIds((prev) => ({ ...prev, [activeTile.question.id]: isRight }));
    if (isRight) {
      soundtrack.playCorrectChime();
      setScore((s) => s + activeTile.question.points);
    }
  }

  function handleReset() {
    setSolvedIds({});
    setActiveTile(null);
    setSelectedOption(null);
    setScore(0);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <p className={`font-medium text-slate-700 ${boardMode || largeType ? 'text-lg' : 'text-base'}`}>
          {payload.instructions}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 tabular-nums shrink-0">
          <span>
            Score: <strong className="text-slate-950 font-mono">{score} pts</strong>
          </span>
          <span aria-hidden="true">·</span>
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>Timer:</span>
            <select
              value={timerLimit}
              onChange={(e) => setTimerLimit(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-900"
            >
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={45}>45s</option>
              <option value={60}>60s</option>
              <option value={90}>90s</option>
              <option value={0}>Untimed</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[38px]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Board
          </button>
        </div>
      </div>

      {allCleared && !activeTile && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <Trophy className="h-6 w-6 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-lg font-semibold text-emerald-950">
                Challenge Board Cleared!
              </h3>
              <p className="text-sm text-emerald-800 tabular-nums">
                Final total: <strong>{score} points</strong> across {totalQuestions} questions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 min-h-[40px]"
          >
            Play Again
          </button>
        </div>
      )}

      {!activeTile ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {payload.categories.map((cat) => (
            <div key={cat.name} className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-center">
                <h3 className="font-display text-sm sm:text-base font-semibold text-white">
                  {cat.name}
                </h3>
              </div>
              {cat.questions.map((q) => {
                const isDone = q.id in solvedIds;
                const wasRight = solvedIds[q.id];
                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={isDone}
                    onClick={() => openTile(cat.name, q)}
                    className={`flex h-24 w-full flex-col items-center justify-center rounded-xl border font-mono text-2xl font-bold tabular-nums transition-all ${
                      isDone
                        ? wasRight
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-100 text-slate-400'
                        : 'border-blue-200 bg-blue-50/60 text-blue-900 hover:border-blue-600 hover:bg-blue-600 hover:text-white'
                    }`}
                  >
                    <span>{q.points}</span>
                    {isDone && (
                      <span className="mt-1 font-sans text-xs font-semibold">
                        {wasRight ? 'Won' : 'Answered'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-blue-200 bg-white p-6 space-y-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="text-blue-700">{activeTile.catName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-950">{activeTile.question.points} pts</span>
            </div>

            <div className="flex items-center gap-3">
              {timerLimit > 0 && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums mr-1 ${
                      secondsLeft <= 5 && selectedOption === null
                        ? 'text-red-700'
                        : 'text-slate-800'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    {secondsLeft}s
                  </span>
                  {selectedOption === null && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSecondsLeft((s) => Math.max(1, s - 5))}
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        -5s
                      </button>
                      <button
                        type="button"
                        onClick={() => setSecondsLeft((s) => s + 10)}
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700 hover:bg-blue-50"
                      >
                        +10s
                      </button>
                    </>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => speakText(activeTile.question.prompt)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
              >
                <Volume2 className="h-4 w-4" />
                Read
              </button>
              {selectedOption === null && (
                <button
                  type="button"
                  onClick={() => {
                    setSolvedIds((prev) => ({ ...prev, [activeTile.question.id]: false }));
                    setActiveTile(null);
                    setSelectedOption(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <SkipForward className="h-3.5 w-3.5 text-slate-500" />
                  Skip Tile
                </button>
              )}
            </div>
          </div>

          <h3
            className={`font-display font-semibold text-slate-950 ${
              boardMode || largeType ? 'text-2xl sm:text-3xl' : 'text-xl'
            }`}
          >
            {activeTile.question.prompt}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeTile.question.options.map((opt, idx) => {
              const answered = selectedOption !== null;
              const isRight = idx === activeTile.question.correctIndex;
              const isChosen = idx === selectedOption;
              let style =
                'border-slate-200 bg-white text-slate-900 hover:border-blue-500 hover:bg-blue-50/40';
              if (answered) {
                if (isRight) {
                  style = 'border-emerald-500 bg-emerald-50 text-emerald-950';
                } else if (isChosen) {
                  style = 'border-red-400 bg-red-50 text-red-950';
                } else {
                  style = 'border-slate-200 bg-slate-50 text-slate-500';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={answered}
                  onClick={() => handleAnswer(idx)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all min-h-[56px] ${style}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-current/20 font-mono text-xs font-semibold">
                    {LETTERS[idx]}
                  </span>
                  <span className={boardMode || largeType ? 'text-lg font-medium' : 'text-sm font-medium'}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedOption !== null && (
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  selectedOption === activeTile.question.correctIndex
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                    : 'border-amber-200 bg-amber-50 text-amber-950'
                }`}
              >
                {selectedOption === activeTile.question.correctIndex ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                  <p className="font-semibold">
                    {selectedOption === activeTile.question.correctIndex
                      ? `Correct! +${activeTile.question.points} points earned.`
                      : `Best Answer: ${LETTERS[activeTile.question.correctIndex]} — ${
                          activeTile.question.options[activeTile.question.correctIndex]
                        }`}
                  </p>
                  <p className="mt-1 opacity-90">{activeTile.question.explanation}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {boardMode &&
                  onAwardSpecificPoints &&
                  selectedOption === activeTile.question.correctIndex && (
                    <button
                      type="button"
                      onClick={() => onAwardSpecificPoints(activeTile.question.points)}
                      className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[40px]"
                    >
                      Award +{activeTile.question.points} to Highlighted Team
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTile(null);
                    setSelectedOption(null);
                  }}
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 min-h-[44px]"
                >
                  Return to Grid
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

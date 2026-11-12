import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Lightbulb, RotateCcw, SkipForward, Volume2, AlertCircle } from 'lucide-react';
import type { MatchPayload } from '../../types.ts';
import { speakText } from '../../utils/speech.ts';

interface MatchPlayerProps {
  payload: MatchPayload;
  boardMode: boolean;
  largeType: boolean;
  readAloudEnabled: boolean;
  onProgress?: (score: number, total: number, completed: boolean, summary: string) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function MatchPlayer({
  payload,
  boardMode,
  largeType,
  readAloudEnabled,
  onProgress,
}: MatchPlayerProps) {
  const leftItems = useMemo(() => shuffle(payload.pairs), [payload.pairs]);
  const rightItems = useMemo(() => shuffle(payload.pairs), [payload.pairs]);

  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<{
    status: 'correct' | 'retry';
    text: string;
  } | null>(null);

  const total = payload.pairs.length;
  const isComplete = matchedIds.length === total && total > 0;

  useEffect(() => {
    setSelectedLeftId(null);
    setMatchedIds([]);
    setAttempts(0);
    setFeedback(null);
  }, [payload.pairs]);

  useEffect(() => {
    onProgress?.(
      matchedIds.length,
      total,
      isComplete,
      isComplete
        ? `Matched all ${total} pairs in ${attempts} tries`
        : `${matchedIds.length} of ${total} pairs matched`
    );
  }, [matchedIds.length, total, isComplete, attempts, onProgress]);

  function handleSelectRight(rightPairId: string) {
    if (!selectedLeftId || matchedIds.includes(rightPairId)) return;
    setAttempts((a) => a + 1);

    const matchedPair = payload.pairs.find((p) => p.id === rightPairId);
    if (selectedLeftId === rightPairId && matchedPair) {
      const next = [...matchedIds, rightPairId];
      setMatchedIds(next);
      setSelectedLeftId(null);
      const msg = `Matched: ${matchedPair.left} connects to ${matchedPair.right}. ${matchedPair.connectionNote}`;
      setFeedback({ status: 'correct', text: msg });
      if (readAloudEnabled) speakText(msg);
    } else {
      const leftItem = payload.pairs.find((p) => p.id === selectedLeftId);
      const rightItem = payload.pairs.find((p) => p.id === rightPairId);
      const msg = `"${leftItem?.left}" does not pair with "${rightItem?.right}". Try another connection.`;
      setFeedback({ status: 'retry', text: msg });
      if (readAloudEnabled) speakText(msg);
    }
  }

  function handleRevealHint() {
    const remaining = payload.pairs.find((p) => !matchedIds.includes(p.id));
    if (!remaining) return;
    setMatchedIds((prev) => [...prev, remaining.id]);
    setSelectedLeftId(null);
    setFeedback({
      status: 'correct',
      text: `Hint revealed: ${remaining.left} pairs with ${remaining.right}. ${remaining.connectionNote}`,
    });
  }

  function handleReset() {
    setSelectedLeftId(null);
    setMatchedIds([]);
    setAttempts(0);
    setFeedback(null);
  }

  const cardTextClass = boardMode || largeType ? 'text-lg' : 'text-sm';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <p className={`font-medium text-slate-700 ${boardMode || largeType ? 'text-lg' : 'text-base'}`}>
          {payload.instructions}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 tabular-nums shrink-0">
          <span>
            Pairs: <strong className="text-slate-900">{matchedIds.length}/{total}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Tries: <strong className="text-slate-900">{attempts}</strong>
          </span>
          {!isComplete && (
            <>
              <button
                type="button"
                onClick={handleRevealHint}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px] whitespace-nowrap"
              >
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                Reveal 1 Pair
              </button>
              <button
                type="button"
                onClick={() => {
                  const target =
                    (selectedLeftId && payload.pairs.find((p) => p.id === selectedLeftId)) ||
                    payload.pairs.find((p) => !matchedIds.includes(p.id));
                  if (!target) return;
                  setMatchedIds((prev) => [...prev, target.id]);
                  setSelectedLeftId(null);
                  setFeedback({
                    status: 'correct',
                    text: `Skipped pair: ${target.left} ↔ ${target.right}`,
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px] whitespace-nowrap"
              >
                <SkipForward className="h-3.5 w-3.5 text-slate-500" />
                Skip Pair
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px] whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            feedback.status === 'correct'
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
              : 'border-amber-200 bg-amber-50/80 text-amber-950'
          }`}
        >
          {feedback.status === 'correct' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium">{feedback.text}</p>
        </div>
      )}

      {!isComplete && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              1. {payload.leftHeading}
            </h4>
            {leftItems.map((pair) => {
              const isMatched = matchedIds.includes(pair.id);
              const isSelected = selectedLeftId === pair.id;
              return (
                <div key={`l-${pair.id}`} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isMatched}
                    onClick={() => {
                      setSelectedLeftId(pair.id);
                      if (readAloudEnabled) speakText(pair.left);
                    }}
                    className={`flex-1 rounded-xl border px-4 py-3 text-left font-medium transition-all min-h-[48px] ${cardTextClass} ${
                      isMatched
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 opacity-65'
                        : isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-600/20'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {pair.left}
                  </button>
                  {!isMatched && (
                    <button
                      type="button"
                      aria-label={`Read ${pair.left}`}
                      onClick={() => speakText(pair.left)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              2. {payload.rightHeading}
            </h4>
            {rightItems.map((pair) => {
              const isMatched = matchedIds.includes(pair.id);
              return (
                <div key={`r-${pair.id}`} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isMatched || !selectedLeftId}
                    onClick={() => handleSelectRight(pair.id)}
                    className={`flex-1 rounded-xl border px-4 py-3 text-left font-medium transition-all min-h-[48px] ${cardTextClass} ${
                      isMatched
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 opacity-65'
                        : selectedLeftId
                        ? 'border-slate-300 bg-white text-slate-900 hover:border-blue-500 hover:bg-blue-50/40'
                        : 'border-slate-200 bg-slate-50/70 text-slate-600'
                    }`}
                  >
                    {pair.right}
                  </button>
                  {!isMatched && (
                    <button
                      type="button"
                      aria-label={`Read ${pair.right}`}
                      onClick={() => speakText(pair.right)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {matchedIds.length > 0 && (
        <div className="space-y-3 border-t border-slate-200 pt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Verified Connections ({matchedIds.length})
            </h4>
            {isComplete && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors min-h-[40px]"
              >
                Play Again
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matchedIds.map((id) => {
              const pair = payload.pairs.find((p) => p.id === id);
              if (!pair) return null;
              return (
                <div
                  key={`matched-${id}`}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>{pair.left}</span>
                    <span className="text-slate-400">↔</span>
                    <span>{pair.right}</span>
                  </div>
                  {pair.connectionNote && (
                    <p className="mt-1.5 text-xs text-slate-600">{pair.connectionNote}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

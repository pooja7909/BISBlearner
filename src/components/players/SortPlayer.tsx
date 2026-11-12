import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, SkipForward, Volume2, AlertCircle } from 'lucide-react';
import type { SortItem, SortPayload } from '../../types.ts';
import { speakText } from '../../utils/speech.ts';

interface SortPlayerProps {
  payload: SortPayload;
  boardMode: boolean;
  largeType: boolean;
  readAloudEnabled: boolean;
  onProgress?: (score: number, total: number, completed: boolean, summary: string) => void;
}

function shuffleArray<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function SortPlayer({
  payload,
  boardMode,
  largeType,
  readAloudEnabled,
  onProgress,
}: SortPlayerProps) {
  const shuffledItems = useMemo(() => shuffleArray(payload.items), [payload.items]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    shuffledItems[0]?.id ?? null
  );
  const [placedMap, setPlacedMap] = useState<Record<string, string>>({});
  const [skippedIds, setSkippedIds] = useState<Record<string, boolean>>({});
  const [attempts, setAttempts] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [triedWrongIds, setTriedWrongIds] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{
    status: 'correct' | 'retry';
    title: string;
    detail: string;
  } | null>(null);

  const remainingItems = shuffledItems.filter(
    (item) => !placedMap[item.id] && !skippedIds[item.id]
  );
  const activeItem: SortItem | undefined =
    remainingItems.find((i) => i.id === selectedItemId) ?? remainingItems[0];

  const totalCount = payload.items.length;
  const placedCount = Object.keys(placedMap).length;
  const skippedCount = Object.keys(skippedIds).length;
  const isComplete = placedCount + skippedCount === totalCount && totalCount > 0;

  useEffect(() => {
    setSelectedItemId(shuffledItems[0]?.id ?? null);
    setPlacedMap({});
    setSkippedIds({});
    setAttempts(0);
    setFirstTryCorrect(0);
    setTriedWrongIds({});
    setFeedback(null);
  }, [shuffledItems]);

  useEffect(() => {
    onProgress?.(
      placedCount,
      totalCount,
      isComplete,
      isComplete
        ? `Sorted all ${totalCount} items (${firstTryCorrect} first-try)`
        : `Sorted ${placedCount} of ${totalCount}`
    );
  }, [placedCount, totalCount, isComplete, firstTryCorrect, onProgress]);

  function handlePlaceInBucket(bucketId: string) {
    if (!activeItem || isComplete) return;
    setAttempts((a) => a + 1);

    const targetBucket = payload.buckets.find((b) => b.id === bucketId);
    if (activeItem.bucketId === bucketId) {
      const nextPlaced = { ...placedMap, [activeItem.id]: bucketId };
      setPlacedMap(nextPlaced);
      if (!triedWrongIds[activeItem.id]) {
        setFirstTryCorrect((c) => c + 1);
      }
      const nextRemaining = shuffledItems.filter((item) => !nextPlaced[item.id]);
      setSelectedItemId(nextRemaining[0]?.id ?? null);

      const msg = `${activeItem.text} belongs in ${targetBucket?.label ?? 'this group'}. ${activeItem.reason}`;
      setFeedback({
        status: 'correct',
        title: `Placed in ${targetBucket?.label ?? 'Group'}`,
        detail: activeItem.reason,
      });
      if (readAloudEnabled) speakText(msg);
    } else {
      setTriedWrongIds((prev) => ({ ...prev, [activeItem.id]: true }));
      const msg = `Not quite ${targetBucket?.label ?? 'that group'}. Look closely at the category clues and try another bucket.`;
      setFeedback({
        status: 'retry',
        title: `Check ${targetBucket?.label ?? 'Category'}`,
        detail: `Think about whether "${activeItem.text}" matches: ${targetBucket?.description ?? ''}`,
      });
      if (readAloudEnabled) speakText(msg);
    }
  }

  function handleSkipCard() {
    if (!activeItem || isComplete) return;
    const nextSkipped = { ...skippedIds, [activeItem.id]: true };
    setSkippedIds(nextSkipped);
    const nextRemaining = shuffledItems.filter(
      (item) => !placedMap[item.id] && !nextSkipped[item.id]
    );
    setSelectedItemId(nextRemaining[0]?.id ?? null);
    setFeedback(null);
  }

  function handleReset() {
    setPlacedMap({});
    setSkippedIds({});
    setSelectedItemId(shuffledItems[0]?.id ?? null);
    setAttempts(0);
    setFirstTryCorrect(0);
    setTriedWrongIds({});
    setFeedback(null);
  }

  const textSizeClass = boardMode || largeType ? 'text-lg' : 'text-base';
  const headingSizeClass = boardMode || largeType ? 'text-xl' : 'text-lg';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <p className={`font-medium text-slate-700 ${textSizeClass}`}>{payload.instructions}</p>
        <div className="flex items-center gap-4 text-sm text-slate-600 tabular-nums shrink-0">
          <span>
            Placed: <strong className="text-slate-900">{placedCount}/{totalCount}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Attempts: <strong className="text-slate-900">{attempts}</strong>
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors min-h-[40px] whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      {!isComplete ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Active Card ({remainingItems.length} remaining)
            </h3>
            {activeItem && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => speakText(activeItem.text)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  Read card
                </button>
                <button
                  type="button"
                  onClick={handleSkipCard}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 whitespace-nowrap"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip card
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {remainingItems.map((item) => {
              const isSelected = activeItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedItemId(item.id);
                    if (readAloudEnabled) speakText(item.text);
                  }}
                  className={`rounded-xl border px-4 py-3 text-left font-medium transition-all min-h-[44px] ${
                    boardMode || largeType ? 'text-lg' : 'text-sm'
                  } ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {item.text}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h3 className={`font-display font-semibold text-emerald-950 ${headingSizeClass}`}>
                  All {totalCount} items classified
                </h3>
                <p className="text-sm text-emerald-800 mt-1 tabular-nums">
                  {firstTryCorrect} out of {totalCount} placed accurately on the first try. Review the grouped cards below with the class.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors min-h-[44px] whitespace-nowrap shrink-0"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

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
          <div className="space-y-1">
            <p className="text-sm font-semibold">{feedback.title}</p>
            <p className={`${boardMode || largeType ? 'text-base' : 'text-sm'} opacity-90`}>
              {feedback.detail}
            </p>
          </div>
        </div>
      )}

      <div
        className={`grid gap-4 ${
          payload.buckets.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'
        }`}
      >
        {payload.buckets.map((bucket) => {
          const itemsInBucket = payload.items.filter((i) => placedMap[i.id] === bucket.id);
          return (
            <div
              key={bucket.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h4 className={`font-display font-semibold text-slate-900 ${headingSizeClass}`}>
                    {bucket.label}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {bucket.description}
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums shrink-0">
                  {itemsInBucket.length}
                </span>
              </div>

              {!isComplete && activeItem && (
                <button
                  type="button"
                  onClick={() => handlePlaceInBucket(bucket.id)}
                  className="mb-3 w-full rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors min-h-[44px]"
                >
                  Place "{activeItem.text.length > 26 ? activeItem.text.slice(0, 26) + '…' : activeItem.text}" here
                </button>
              )}

              <div className="space-y-2 flex-1">
                {itemsInBucket.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No items placed here yet
                  </p>
                ) : (
                  itemsInBucket.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800"
                    >
                      <p className="font-medium text-slate-900">{item.text}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  RotateCcw,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import type { SequencePayload, SequenceStep } from '../../types.ts';
import { speakText } from '../../utils/speech.ts';

interface SequencePlayerProps {
  payload: SequencePayload;
  boardMode: boolean;
  largeType: boolean;
  readAloudEnabled: boolean;
  onProgress?: (score: number, total: number, completed: boolean, summary: string) => void;
}

function derangeSteps(steps: SequenceStep[]): SequenceStep[] {
  const copy = [...steps];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  const alreadyOrdered = copy.every((s, idx) => s.order === idx + 1);
  if (alreadyOrdered && copy.length > 1) {
    [copy[0], copy[1]] = [copy[1], copy[0]];
  }
  return copy;
}

export function SequencePlayer({
  payload,
  boardMode,
  largeType,
  readAloudEnabled,
  onProgress,
}: SequencePlayerProps) {
  const initialShuffled = useMemo(() => derangeSteps(payload.steps), [payload.steps]);
  const [ordered, setOrdered] = useState<SequenceStep[]>(initialShuffled);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [checkedPositions, setCheckedPositions] = useState<Record<number, boolean>>({});
  const [hasChecked, setHasChecked] = useState(false);
  const [showClues, setShowClues] = useState(false);

  const total = payload.steps.length;
  const correctCount = ordered.filter((step, idx) => step.order === idx + 1).length;
  const isComplete = hasChecked && correctCount === total && total > 0;

  useEffect(() => {
    setOrdered(initialShuffled);
    setSelectedIndex(null);
    setCheckedPositions({});
    setHasChecked(false);
  }, [initialShuffled]);

  useEffect(() => {
    onProgress?.(
      hasChecked ? correctCount : 0,
      total,
      isComplete,
      isComplete
        ? `All ${total} steps ordered accurately`
        : hasChecked
        ? `${correctCount} of ${total} steps in right spot`
        : 'Arranging sequence'
    );
  }, [correctCount, total, isComplete, hasChecked, onProgress]);

  function moveStep(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= ordered.length) return;
    const next = [...ordered];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setOrdered(next);
    setHasChecked(false);
    setCheckedPositions({});
    setSelectedIndex(null);
  }

  function handleSwapSelect(idx: number) {
    if (selectedIndex === null) {
      setSelectedIndex(idx);
      if (readAloudEnabled) speakText(ordered[idx].label);
      return;
    }
    if (selectedIndex === idx) {
      setSelectedIndex(null);
      return;
    }
    const next = [...ordered];
    [next[selectedIndex], next[idx]] = [next[idx], next[selectedIndex]];
    setOrdered(next);
    setSelectedIndex(null);
    setHasChecked(false);
    setCheckedPositions({});
  }

  function handleCheckOrder() {
    const status: Record<number, boolean> = {};
    let hits = 0;
    ordered.forEach((step, idx) => {
      const ok = step.order === idx + 1;
      status[idx] = ok;
      if (ok) hits++;
    });
    setCheckedPositions(status);
    setHasChecked(true);
    setSelectedIndex(null);
    if (readAloudEnabled) {
      speakText(
        hits === total
          ? 'Well done! Every step is in the exact right order.'
          : `${hits} out of ${total} steps are in the right position. Check the highlighted cards.`
      );
    }
  }

  function handleReset() {
    setOrdered(derangeSteps(payload.steps));
    setSelectedIndex(null);
    setCheckedPositions({});
    setHasChecked(false);
  }

  const textSizeClass = boardMode || largeType ? 'text-lg' : 'text-base';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <p className={`font-medium text-slate-700 ${textSizeClass}`}>{payload.instructions}</p>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowClues((c) => !c)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors min-h-[40px] whitespace-nowrap ${
              showClues
                ? 'border-blue-600 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            {showClues ? 'Hide Clues' : 'Show Clues'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors min-h-[40px] whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Shuffle
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Tip: Use the arrow buttons to move cards up or down, or tap two cards to swap their positions.
      </p>

      <div className="space-y-3">
        {ordered.map((step, idx) => {
          const isSelected = selectedIndex === idx;
          const status = hasChecked ? checkedPositions[idx] : undefined;

          return (
            <div
              key={step.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition-colors ${
                status === true
                  ? 'border-emerald-300 bg-emerald-50/70'
                  : status === false
                  ? 'border-amber-300 bg-amber-50/70'
                  : isSelected
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => handleSwapSelect(idx)}
                className="flex items-start gap-4 text-left flex-1 min-w-0"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 font-mono text-sm font-semibold text-slate-700 tabular-nums">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4
                      className={`font-display font-semibold text-slate-900 ${
                        boardMode || largeType ? 'text-xl' : 'text-base'
                      }`}
                    >
                      {step.label}
                    </h4>
                    {status === true && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Position Correct
                      </span>
                    )}
                    {status === false && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Check Position
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1 text-slate-600 ${
                      boardMode || largeType ? 'text-base' : 'text-sm'
                    }`}
                  >
                    {step.detail}
                  </p>
                  {showClues && step.clue && (
                    <p className="mt-1.5 text-xs font-medium text-blue-700">
                      Clue: {step.clue}
                    </p>
                  )}
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  aria-label={`Read step ${idx + 1}`}
                  onClick={() => speakText(`${step.label}. ${step.detail}`)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={idx === 0}
                  aria-label={`Move ${step.label} up`}
                  onClick={() => moveStep(idx, idx - 1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-35"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={idx === ordered.length - 1}
                  aria-label={`Move ${step.label} down`}
                  onClick={() => moveStep(idx, idx + 1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-35"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        {hasChecked ? (
          <div
            className={`text-sm font-semibold tabular-nums ${
              isComplete ? 'text-emerald-700' : 'text-amber-800'
            }`}
          >
            {isComplete
              ? `Complete! All ${total} steps are in accurate order.`
              : `${correctCount} of ${total} steps are currently in the right position.`}
          </div>
        ) : (
          <span className="text-sm text-slate-500">
            Ready when your class agrees on the sequence.
          </span>
        )}
        <button
          type="button"
          onClick={handleCheckOrder}
          className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors min-h-[44px] whitespace-nowrap shrink-0"
        >
          Check Order
        </button>
      </div>
    </div>
  );
}

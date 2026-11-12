import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, RotateCcw, Volume2, AlertCircle } from 'lucide-react';
import type { ClozePayload } from '../../types.ts';
import { speakText } from '../../utils/speech.ts';

interface ClozePlayerProps {
  payload: ClozePayload;
  boardMode: boolean;
  largeType: boolean;
  readAloudEnabled: boolean;
  onProgress?: (score: number, total: number, completed: boolean, summary: string) => void;
}

function shuffleWords(words: string[]): string[] {
  const copy = [...words];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function ClozePlayer({
  payload,
  boardMode,
  largeType,
  readAloudEnabled,
  onProgress,
}: ClozePlayerProps) {
  const blanks = useMemo(
    () => payload.segments.filter((s) => Boolean(s.blankId && s.answer)),
    [payload.segments]
  );

  const wordBank = useMemo(() => {
    const answers = blanks.map((b) => b.answer!).filter(Boolean);
    return shuffleWords([...answers, ...payload.distractors]);
  }, [blanks, payload.distractors]);

  const [answersMap, setAnswersMap] = useState<Record<string, string>>({});
  const [activeBlankId, setActiveBlankId] = useState<string | null>(
    blanks[0]?.blankId ?? null
  );
  const [checked, setChecked] = useState(false);
  const [showClues, setShowClues] = useState(false);

  const total = blanks.length;
  const correctCount = blanks.filter(
    (b) =>
      answersMap[b.blankId!]?.trim().toLowerCase() === b.answer!.trim().toLowerCase()
  ).length;
  const isComplete = checked && correctCount === total && total > 0;

  useEffect(() => {
    setAnswersMap({});
    setActiveBlankId(blanks[0]?.blankId ?? null);
    setChecked(false);
  }, [blanks]);

  useEffect(() => {
    const filledCount = Object.keys(answersMap).length;
    onProgress?.(
      checked ? correctCount : filledCount,
      total,
      isComplete,
      isComplete
        ? `Completed passage (${total}/${total})`
        : checked
        ? `${correctCount}/${total} accurate`
        : `${filledCount}/${total} blanks filled`
    );
  }, [answersMap, checked, correctCount, total, isComplete, onProgress]);

  const usedWords = new Set(Object.values(answersMap));

  function handleSelectWord(word: string) {
    if (usedWords.has(word)) return;
    const targetBlank =
      activeBlankId && !answersMap[activeBlankId]
        ? activeBlankId
        : blanks.find((b) => !answersMap[b.blankId!])?.blankId;

    if (!targetBlank) return;
    const next = { ...answersMap, [targetBlank]: word };
    setAnswersMap(next);
    setChecked(false);

    const nextEmpty = blanks.find((b) => !next[b.blankId!]);
    setActiveBlankId(nextEmpty?.blankId ?? null);
    if (readAloudEnabled) speakText(word);
  }

  function handleClearBlank(blankId: string) {
    if (answersMap[blankId]) {
      const next = { ...answersMap };
      delete next[blankId];
      setAnswersMap(next);
      setActiveBlankId(blankId);
      setChecked(false);
    } else {
      setActiveBlankId(blankId);
    }
  }

  function handleCheck() {
    setChecked(true);
    if (readAloudEnabled) {
      const fullSentence = payload.segments
        .map((s) => (s.blankId ? answersMap[s.blankId] || 'blank' : s.text))
        .join('');
      speakText(fullSentence);
    }
  }

  function handleReset() {
    setAnswersMap({});
    setActiveBlankId(blanks[0]?.blankId ?? null);
    setChecked(false);
  }

  function handleReadPassage() {
    const text = payload.segments
      .map((s) => (s.blankId ? answersMap[s.blankId] || 'blank' : s.text))
      .join('');
    speakText(text);
  }

  const passageTextSize =
    boardMode || largeType ? 'text-xl leading-loose' : 'text-lg leading-relaxed';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <p className={`font-medium text-slate-700 ${boardMode || largeType ? 'text-lg' : 'text-base'}`}>
          {payload.instructions}
        </p>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReadPassage}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px] whitespace-nowrap"
          >
            <Volume2 className="h-3.5 w-3.5" />
            Read Passage
          </button>
          <button
            type="button"
            onClick={() => setShowClues((c) => !c)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold min-h-[40px] whitespace-nowrap ${
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px] whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      <div className={`rounded-xl border border-slate-200 bg-slate-50/50 p-6 ${passageTextSize}`}>
        {payload.segments.map((seg, idx) => {
          if (!seg.blankId) {
            return <span key={`t-${idx}`}>{seg.text}</span>;
          }
          const filledWord = answersMap[seg.blankId];
          const isActive = activeBlankId === seg.blankId;
          const isRight =
            checked &&
            filledWord?.trim().toLowerCase() === seg.answer?.trim().toLowerCase();
          const isWrong = checked && !isRight;

          return (
            <button
              key={seg.blankId}
              type="button"
              onClick={() => handleClearBlank(seg.blankId!)}
              className={`mx-1 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 font-semibold transition-all align-baseline min-h-[38px] ${
                isRight
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : isWrong
                  ? 'border-amber-400 bg-amber-50 text-amber-950'
                  : isActive
                  ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/20'
                  : filledWord
                  ? 'border-slate-300 bg-white text-slate-900'
                  : 'border-dashed border-slate-400 bg-white text-slate-400 hover:border-blue-500'
              }`}
            >
              {filledWord ? (
                <>
                  <span>{filledWord}</span>
                  {isRight && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                  {isWrong && <AlertCircle className="h-4 w-4 text-amber-700" />}
                </>
              ) : (
                <span className="text-sm font-mono">Select word</span>
              )}
            </button>
          );
        })}
      </div>

      {showClues && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Vocabulary Clues
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
            {blanks.map((b, i) => (
              <p key={`clue-${b.blankId}`}>
                <span className="font-mono font-semibold text-slate-900">Blank {i + 1}:</span>{' '}
                {b.clue}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Word Bank (tap to fill active blank — includes distractors)
          </h4>
          <span className="text-xs text-slate-500 tabular-nums">
            {Object.keys(answersMap).length}/{total} blanks filled
          </span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {wordBank.map((word) => {
            const isUsed = usedWords.has(word);
            return (
              <button
                key={word}
                type="button"
                disabled={isUsed}
                onClick={() => handleSelectWord(word)}
                className={`rounded-xl border px-4 py-2.5 font-semibold transition-all min-h-[44px] ${
                  boardMode || largeType ? 'text-base' : 'text-sm'
                } ${
                  isUsed
                    ? 'border-slate-100 bg-slate-100 text-slate-400 line-through cursor-not-allowed'
                    : 'border-slate-200 bg-white text-slate-900 hover:border-blue-600 hover:bg-blue-50'
                }`}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
        {checked ? (
          <p
            className={`text-sm font-semibold tabular-nums ${
              isComplete ? 'text-emerald-700' : 'text-amber-800'
            }`}
          >
            {isComplete
              ? `Excellent! All ${total} curriculum terms placed accurately.`
              : `${correctCount} of ${total} terms are accurate. Tap any amber word to swap it.`}
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Tap any placed word in the passage to return it to the word bank.
          </p>
        )}
        <button
          type="button"
          onClick={handleCheck}
          disabled={Object.keys(answersMap).length === 0}
          className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-40 transition-colors min-h-[44px] whitespace-nowrap"
        >
          Check Passage
        </button>
      </div>
    </div>
  );
}

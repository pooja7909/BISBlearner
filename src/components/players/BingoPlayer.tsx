import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Dices, RotateCcw, SkipForward, Trophy, Volume2, AlertCircle } from 'lucide-react';
import type { BingoEntry, BingoPayload, LiveRoom } from '../../types.ts';
import { speakText } from '../../utils/speech.ts';
import { soundtrack } from '../../utils/soundtrack.ts';

interface BingoPlayerProps {
  payload: BingoPayload;
  boardMode: boolean;
  largeType: boolean;
  readAloudEnabled: boolean;
  liveRoom?: LiveRoom | null;
  isStudentMode?: boolean;
  onTeacherControl?: (action: Record<string, unknown>) => void;
  onProgress?: (score: number, total: number, completed: boolean, summary: string) => void;
}

function shuffleEntries(list: BingoEntry[]): BingoEntry[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function BingoPlayer({
  payload,
  boardMode,
  largeType,
  readAloudEnabled,
  liveRoom,
  isStudentMode,
  onTeacherControl,
  onProgress,
}: BingoPlayerProps) {
  const [cardSeed, setCardSeed] = useState(0);
  const gridEntries = useMemo(() => {
    const shuffled = shuffleEntries(payload.entries);
    return shuffled.slice(0, 9);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload.entries, cardSeed]);

  const [localCalledIds, setLocalCalledIds] = useState<string[]>([]);
  const [markedIds, setMarkedIds] = useState<string[]>([]);
  const [missMessage, setMissMessage] = useState<string | null>(null);

  const calledIds = liveRoom ? liveRoom.bingoCalledIds : localCalledIds;
  const activeEntryId = calledIds[calledIds.length - 1] ?? null;
  const activeEntry = payload.entries.find((e) => e.id === activeEntryId) ?? null;
  const remainingPool = payload.entries.filter((e) => !calledIds.includes(e.id));

  const markedIndices = new Set(
    gridEntries.map((e, i) => (markedIds.includes(e.id) ? i : -1)).filter((i) => i !== -1)
  );
  const hasLineBingo = WIN_LINES.some((line) => line.every((idx) => markedIndices.has(idx)));
  const hasFullHouse = gridEntries.length > 0 && markedIndices.size === gridEntries.length;

  useEffect(() => {
    setLocalCalledIds([]);
    setMarkedIds([]);
    setMissMessage(null);
  }, [payload.entries]);

  useEffect(() => {
    onProgress?.(
      markedIndices.size,
      gridEntries.length,
      hasFullHouse,
      hasFullHouse
        ? 'Full House Bingo!'
        : hasLineBingo
        ? `Line Bingo! (${markedIndices.size}/9)`
        : `${markedIndices.size}/9 squares marked`
    );
  }, [markedIndices.size, gridEntries.length, hasLineBingo, hasFullHouse, onProgress]);

  function handleDrawClue() {
    if (remainingPool.length === 0) return;
    const next = remainingPool[Math.floor(Math.random() * remainingPool.length)];
    soundtrack.playBingoCall();
    if (readAloudEnabled) {
      speakText(`Clue: ${next.clue}`);
    }
    if (liveRoom && onTeacherControl) {
      onTeacherControl({ bingoEntryId: next.id });
    } else {
      setLocalCalledIds((prev) => [...prev, next.id]);
    }
    setMissMessage(null);
  }

  function handleTapCell(entry: BingoEntry) {
    if (markedIds.includes(entry.id)) return;
    if (!calledIds.includes(entry.id)) {
      setMissMessage(`"${entry.term}" has not been called yet — listen closely to the clue!`);
      return;
    }
    const nextMarked = [...markedIds, entry.id];
    setMarkedIds(nextMarked);
    setMissMessage(null);

    const nextIndices = new Set(
      gridEntries.map((e, i) => (nextMarked.includes(e.id) ? i : -1)).filter((i) => i !== -1)
    );
    const wonLine = WIN_LINES.some((line) => line.every((idx) => nextIndices.has(idx)));
    if (wonLine) {
      soundtrack.playUnlockFanfare();
    } else {
      soundtrack.playCorrectChime();
    }
  }

  function handleReset() {
    setMarkedIds([]);
    setMissMessage(null);
    setCardSeed((s) => s + 1);
    if (liveRoom && onTeacherControl && !isStudentMode) {
      onTeacherControl({ resetBingo: true });
    } else {
      setLocalCalledIds([]);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <p className={`font-medium text-slate-700 ${boardMode || largeType ? 'text-lg' : 'text-base'}`}>
          {payload.instructions}
        </p>
        <div className="flex items-center gap-3 text-sm text-slate-600 tabular-nums shrink-0">
          <span>
            Clues Called: <strong className="text-slate-900">{calledIds.length}/{payload.entries.length}</strong>
          </span>
          {!isStudentMode && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New Game
            </button>
          )}
        </div>
      </div>

      {/* Caller Clue Stage */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
            {activeEntry ? `Current Clue (${calledIds.length} of ${payload.entries.length})` : 'Ready to Start Bingo'}
          </p>
          <p
            className={`font-display font-semibold text-slate-950 ${
              boardMode || largeType ? 'text-2xl' : 'text-lg'
            }`}
          >
            {activeEntry
              ? activeEntry.clue
              : isStudentMode
              ? 'Waiting for your teacher to draw the first clue…'
              : 'Press "Draw Next Clue" to call the first concept clue.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeEntry && (
            <button
              type="button"
              onClick={() => speakText(activeEntry.clue)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-blue-900 hover:bg-blue-100 min-h-[44px]"
            >
              <Volume2 className="h-4 w-4" />
              Read Clue
            </button>
          )}
          {(!isStudentMode || !liveRoom) && (
            <>
              <button
                type="button"
                disabled={remainingPool.length === 0}
                onClick={handleDrawClue}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-45 transition-colors min-h-[44px] whitespace-nowrap"
              >
                <Dices className="h-4 w-4" />
                {remainingPool.length === 0 ? 'All Clues Called' : 'Draw Next Clue'}
              </button>
              {activeEntry && remainingPool.length > 0 && (
                <button
                  type="button"
                  onClick={handleDrawClue}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 min-h-[44px] whitespace-nowrap"
                >
                  <SkipForward className="h-3.5 w-3.5 text-slate-500" />
                  Skip Clue
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {(hasLineBingo || hasFullHouse) && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950">
          <Trophy className="h-6 w-6 text-emerald-700 shrink-0" />
          <div>
            <p className="font-display text-lg font-semibold">
              {hasFullHouse ? 'Full House Bingo!' : 'Line Bingo Achieved!'}
            </p>
            <p className="text-sm text-emerald-800">
              {hasFullHouse
                ? 'Every square on this card has been matched to its clue.'
                : 'You completed a full row, column, or diagonal—keep playing for a Full House!'}
            </p>
          </div>
        </div>
      )}

      {missMessage && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm font-medium text-amber-950">
          <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
          <span>{missMessage}</span>
        </div>
      )}

      {/* 3x3 Bingo Card */}
      <div className="grid grid-cols-3 gap-3">
        {gridEntries.map((entry) => {
          const isMarked = markedIds.includes(entry.id);
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => handleTapCell(entry)}
              className={`relative flex min-h-[108px] flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                isMarked
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-blue-500 hover:bg-blue-50/40'
              }`}
            >
              <span
                className={`font-display font-semibold leading-snug ${
                  boardMode || largeType ? 'text-xl' : 'text-base'
                }`}
              >
                {entry.term}
              </span>
              {isMarked && (
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Matched
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

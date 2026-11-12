import { useMemo, useState } from 'react';
import { MessageSquare, Pin, Plus, Trash2 } from 'lucide-react';
import type { LiveRoom, WordCloudPayload, WordSubmission } from '../../types.ts';
import { soundtrack } from '../../utils/soundtrack.ts';

interface WordCloudPlayerProps {
  payload: WordCloudPayload;
  boardMode: boolean;
  largeType: boolean;
  liveRoom?: LiveRoom | null;
  studentSession?: {
    code: string;
    participantId: string;
    name: string;
    team: string;
  } | null;
  onTeacherControl?: (action: Record<string, unknown>) => void;
  onProgress?: (score: number, total: number, completed: boolean, summary: string) => void;
}

export function WordCloudPlayer({
  payload,
  boardMode,
  largeType,
  liveRoom,
  studentSession,
  onTeacherControl,
  onProgress,
}: WordCloudPlayerProps) {
  const [localWords, setLocalWords] = useState<WordSubmission[]>(() =>
    payload.seedWords.map((w, idx) => ({
      id: `local-${idx}`,
      word: w,
      author: 'Starter',
      team: 'Class',
      pinned: false,
    }))
  );
  const [inputWord, setInputWord] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myCount, setMyCount] = useState(0);

  const words = liveRoom ? liveRoom.wordSubmissions : localWords;

  const aggregated = useMemo(() => {
    const map = new Map<
      string,
      { display: string; count: number; pinned: boolean; ids: string[] }
    >();
    words.forEach((entry) => {
      const key = entry.word.trim().toLowerCase();
      if (!key) return;
      const current = map.get(key);
      if (current) {
        current.count += 1;
        if (entry.pinned) current.pinned = true;
        current.ids.push(entry.id);
      } else {
        map.set(key, {
          display: entry.word.trim(),
          count: 1,
          pinned: Boolean(entry.pinned),
          ids: [entry.id],
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [words]);

  async function handleSubmitWord(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clean = inputWord.trim();
    if (!clean) return;

    if (liveRoom) {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/rooms/${liveRoom.code}/word`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: clean,
            author: studentSession?.name || 'Teacher',
            team: studentSession?.team || 'Class',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not add word.');
        soundtrack.playCorrectChime();
        setInputWord('');
        const nextCount = myCount + 1;
        setMyCount(nextCount);
        onProgress?.(nextCount, 2, nextCount >= 1, `Shared ${nextCount} word(s)`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to send word.');
      } finally {
        setSubmitting(false);
      }
    } else {
      setLocalWords((prev) => [
        ...prev,
        {
          id: `lw-${Date.now()}-${Math.random()}`,
          word: clean,
          author: 'Class',
          team: 'Class',
          pinned: false,
        },
      ]);
      soundtrack.playCorrectChime();
      setInputWord('');
    }
  }

  function handlePin(id: string) {
    if (liveRoom && onTeacherControl) {
      onTeacherControl({ togglePinWordId: id });
    } else {
      setLocalWords((prev) =>
        prev.map((w) => (w.id === id ? { ...w, pinned: !w.pinned } : w))
      );
    }
  }

  function handleDelete(id: string) {
    if (liveRoom && onTeacherControl) {
      onTeacherControl({ deleteWordId: id });
    } else {
      setLocalWords((prev) => prev.filter((w) => w.id !== id));
    }
  }

  const maxCount = Math.max(1, ...aggregated.map((item) => item.count));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 space-y-1.5">
        <p className={`font-semibold text-slate-950 ${boardMode || largeType ? 'text-2xl' : 'text-xl'}`}>
          {payload.prompt}
        </p>
        <p className="text-sm text-slate-600">{payload.instructions}</p>
      </div>

      {/* Submission Bar */}
      <form onSubmit={handleSubmitWord} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          maxLength={32}
          disabled={Boolean(liveRoom?.paused)}
          value={inputWord}
          onChange={(e) => setInputWord(e.target.value)}
          placeholder={
            liveRoom?.paused
              ? 'Submissions paused by teacher'
              : 'Type a word or short 2-word idea…'
          }
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none disabled:bg-slate-100 min-h-[44px]"
        />
        <button
          type="submit"
          disabled={submitting || !inputWord.trim() || Boolean(liveRoom?.paused)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-45 transition-colors min-h-[44px] whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Add to Cloud
        </button>
      </form>

      {error && <p className="text-xs font-medium text-red-700">{error}</p>}

      {/* Dynamic Word Cloud Canvas */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8 min-h-[240px] flex flex-wrap items-center justify-center gap-x-5 gap-y-4">
        {aggregated.length === 0 ? (
          <p className="text-sm text-slate-400">
            Waiting for the first words to appear…
          </p>
        ) : (
          aggregated.map((item, idx) => {
            const ratio = item.count / maxCount;
            const sizeClass =
              ratio > 0.75
                ? 'text-3xl sm:text-4xl font-bold'
                : ratio > 0.45
                ? 'text-2xl font-semibold'
                : item.count > 1
                ? 'text-xl font-semibold'
                : 'text-base font-medium';

            const colorPalette = [
              'text-blue-800',
              'text-slate-900',
              'text-emerald-800',
              'text-indigo-800',
              'text-amber-800',
            ];
            const colorClass = colorPalette[idx % colorPalette.length];

            return (
              <div
                key={item.display}
                className={`group inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-colors ${
                  item.pinned
                    ? 'border border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                    : 'hover:bg-white'
                }`}
              >
                <span className={`font-display ${sizeClass} ${colorClass}`}>
                  {item.display}
                </span>
                {item.count > 1 && (
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    ×{item.count}
                  </span>
                )}
                {!studentSession && (
                  <span className="hidden group-hover:inline-flex items-center gap-1 ml-1">
                    <button
                      type="button"
                      title="Pin key vocabulary"
                      onClick={() => handlePin(item.ids[0])}
                      className="rounded p-1 text-slate-400 hover:text-blue-700"
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Remove word"
                      onClick={() => handleDelete(item.ids[0])}
                      className="rounded p-1 text-slate-400 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-4">
        <MessageSquare className="h-4 w-4 text-blue-700 shrink-0 mt-1" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Follow-up Challenge
          </p>
          <p className="text-sm font-medium text-slate-900 mt-0.5">
            {payload.followUpQuestion}
          </p>
        </div>
      </div>
    </div>
  );
}

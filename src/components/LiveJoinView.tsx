import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { ClassroomActivity } from '../types.ts';

interface LiveJoinViewProps {
  initialCode?: string;
  onJoined: (payload: {
    activity: ClassroomActivity;
    session: {
      code: string;
      participantId: string;
      name: string;
      team: string;
      character: string;
    };
  }) => void;
}

/*
 * Pupil join screen: just the code (pre-filled when they scan the QR code) and a first name.
 * Teams and characters are given out automatically by the server, so there is nothing else to choose.
 */
export function LiveJoinView({ initialCode = '', onJoined }: LiveJoinViewProps) {
  const [code, setCode] = useState(initialCode.toUpperCase().slice(0, 4));
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeFromQr = initialCode.length === 4;

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length !== 4) {
      setError('Type the 4-letter code from the board.');
      return;
    }
    if (!name.trim()) {
      setError('Type your first name.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${cleanCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? "That code didn't work. Check the code on the board and try again."
            : data.error || 'Could not join. Ask your teacher.'
        );
      }
      onJoined({
        activity: data.activity,
        session: {
          code: cleanCode,
          participantId: data.participantId,
          name: name.trim(),
          team: data.team || 'Oak',
          character: data.character || 'fox',
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join. Ask your teacher.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10 px-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <h1 className="font-display text-3xl font-bold text-slate-950 text-center">Join the class game</h1>

        <form onSubmit={handleJoin} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="room-code" className="block text-lg font-semibold text-slate-900">
              Code on the board
            </label>
            <input
              id="room-code"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="ABCD"
              autoFocus={!codeFromQr}
              className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-center font-mono text-4xl font-bold tracking-[0.4em] text-slate-950 uppercase placeholder:text-slate-300 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="student-name" className="block text-lg font-semibold text-slate-900">
              Your first name
            </label>
            <input
              id="student-name"
              type="text"
              autoComplete="given-name"
              maxLength={28}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={codeFromQr}
              className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-3.5 text-xl text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/20"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-base font-medium text-red-900">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-4 text-xl font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors min-h-[60px]"
          >
            {loading ? 'Joining…' : 'Join'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

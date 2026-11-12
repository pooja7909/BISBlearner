import { useState } from 'react';
import { ArrowRight, Users } from 'lucide-react';
import { STUDENT_CHARACTERS, type ClassroomActivity, type StudentCharacterId } from '../types.ts';
import { StudentCharacterIcon } from './StudentCharacterIcon.tsx';

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

const TEAMS = ['Oak', 'Maple', 'Willow', 'Rowan'];

export function LiveJoinView({ initialCode = '', onJoined }: LiveJoinViewProps) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [name, setName] = useState('');
  const [team, setTeam] = useState('Oak');
  const [character, setCharacter] = useState<StudentCharacterId>('fox');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length !== 4) {
      setError('Enter the 4-character room code shown on your classroom board.');
      return;
    }
    if (!name.trim()) {
      setError('Enter your first name so your teacher can see your progress.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${cleanCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), team, character }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not join room.');
      }
      onJoined({
        activity: data.activity,
        session: {
          code: cleanCode,
          participantId: data.participantId,
          name: name.trim(),
          team,
          character,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to join room.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg py-10 px-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Users className="h-5 w-5" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-slate-950">
            Join a Live Classroom Activity
          </h1>
          <p className="text-sm text-slate-600">
            Enter the 4-character code from your teacher’s board to play along on your own device.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="room-code" className="block text-sm font-semibold text-slate-900">
              Room Code
            </label>
            <input
              id="room-code"
              type="text"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. K7M2"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-2xl font-semibold tracking-widest text-slate-950 uppercase placeholder:text-slate-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="student-name" className="block text-sm font-semibold text-slate-900">
              Your First Name
            </label>
            <input
              id="student-name"
              type="text"
              maxLength={28}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-sm font-semibold text-slate-900">Choose Your Character</span>
            <div className="grid grid-cols-4 gap-2">
              {STUDENT_CHARACTERS.map((char) => (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => setCharacter(char.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors min-h-[72px] ${
                    character === char.id
                      ? 'border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <StudentCharacterIcon character={char.id} size="md" />
                  <span className="text-[11px] font-semibold leading-tight">{char.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-sm font-semibold text-slate-900">Your Class Team</span>
            <div className="grid grid-cols-4 gap-2">
              {TEAMS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTeam(t)}
                  className={`rounded-xl border py-2.5 text-xs font-semibold transition-colors min-h-[44px] ${
                    team === t
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors min-h-[48px]"
          >
            {loading ? 'Joining Room…' : 'Enter Activity'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

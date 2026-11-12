import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Lock,
  Minus,
  Monitor,
  Music,
  Pause,
  Pencil,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Sparkles,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  FORMAT_META,
  type ClassroomActivity,
  type DifferentiationTier,
  type LiveRoom,
  type PlayMode,
  type TeamScore,
} from '../types.ts';
import { SortPlayer } from './players/SortPlayer.tsx';
import { SequencePlayer } from './players/SequencePlayer.tsx';
import { MatchPlayer } from './players/MatchPlayer.tsx';
import { QuizPlayer } from './players/QuizPlayer.tsx';
import { ClozePlayer } from './players/ClozePlayer.tsx';
import { BingoPlayer } from './players/BingoPlayer.tsx';
import { DrawPlayer } from './players/DrawPlayer.tsx';
import { WordCloudPlayer } from './players/WordCloudPlayer.tsx';
import { BuzzerPlayer } from './players/BuzzerPlayer.tsx';
import { EscapePlayer } from './players/EscapePlayer.tsx';
import { speakText, stopSpeech } from '../utils/speech.ts';
import { MUSIC_TRACKS, soundtrack, type MusicTrackId } from '../utils/soundtrack.ts';
import { ActivityGuideCard } from './ActivityGuideCard.tsx';
import { StudentCharacterIcon } from './StudentCharacterIcon.tsx';

interface ActivityStageWorkspaceProps {
  activity: ClassroomActivity;
  onBack: () => void;
  onOpenPreview?: () => void;
  onActivityCreated: (activity: ClassroomActivity) => void;
  initialRoomCode?: string | null;
  onOpenDashboard?: (roomCode: string) => void;
  studentSession?: {
    code: string;
    participantId: string;
    name: string;
    team: string;
    character?: string;
  } | null;
}

const DEFAULT_TEAMS: TeamScore[] = [
  { name: 'Oak', points: 0 },
  { name: 'Maple', points: 0 },
  { name: 'Willow', points: 0 },
  { name: 'Rowan', points: 0 },
];

export function ActivityStageWorkspace({
  activity,
  onBack,
  onOpenPreview,
  onActivityCreated,
  initialRoomCode,
  onOpenDashboard,
  studentSession,
}: ActivityStageWorkspaceProps) {
  const isStudentMode = Boolean(studentSession);

  const [boardMode, setBoardMode] = useState(!isStudentMode);
  const [largeType, setLargeType] = useState(false);
  const [calmPaper, setCalmPaper] = useState(false);
  const [readAloudEnabled, setReadAloudEnabled] = useState(false);
  const [guideSkipped, setGuideSkipped] = useState(false);

  // Music & SFX controls
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicTrack, setMusicTrack] = useState<MusicTrackId>('upbeat');
  const [musicVolume, setMusicVolume] = useState(30);
  const [sfxEnabled, setSfxEnabled] = useState(true);

  // Teacher Countdown Timer
  const [classTimerPreset, setClassTimerPreset] = useState(120);
  const [classTimerLeft, setClassTimerLeft] = useState(120);
  const [classTimerRunning, setClassTimerRunning] = useState(false);

  // Teams & Play Mode
  const [playMode, setPlayMode] = useState<PlayMode>('group');
  const [teams, setTeams] = useState<TeamScore[]>(DEFAULT_TEAMS);
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);

  const [adaptingTier, setAdaptingTier] = useState<DifferentiationTier | null>(null);
  const [adaptError, setAdaptError] = useState<string | null>(null);

  const [liveRoom, setLiveRoom] = useState<LiveRoom | null>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setGuideSkipped(false);
    return () => {
      stopSpeech();
      soundtrack.stop();
    };
  }, [activity.id]);

  // Countdown timer tick
  useEffect(() => {
    if (!classTimerRunning) return;
    const id = window.setInterval(() => {
      setClassTimerLeft((prev) => {
        if (prev <= 1) {
          setClassTimerRunning(false);
          soundtrack.playTimerBell();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [classTimerRunning]);

  // Poll live room updates (both teacher and student views!)
  const activeRoomCode = studentSession?.code || liveRoom?.code || initialRoomCode || null;
  useEffect(() => {
    if (!activeRoomCode) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/rooms/${activeRoomCode}`);
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { room: LiveRoom };
          setLiveRoom(data.room);
        }
      } catch {
        // Ignore transient poll errors
      }
    };

    poll();
    const interval = window.setInterval(poll, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeRoomCode]);

  const handleStudentProgress = useCallback(
    async (score: number, total: number, completed: boolean, summary: string) => {
      if (!studentSession) return;
      try {
        await fetch(`/api/rooms/${studentSession.code}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: studentSession.participantId,
            score,
            total,
            completed,
            summary,
          }),
        });
      } catch {
        // Silent retry on next interaction
      }
    },
    [studentSession]
  );

  const handleTeacherControl = useCallback(
    async (action: Record<string, unknown>) => {
      if (!liveRoom || isStudentMode) return;
      try {
        const res = await fetch(`/api/rooms/${liveRoom.code}/control`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
        if (res.ok) {
          const data = (await res.json()) as { room: LiveRoom };
          setLiveRoom(data.room);
        }
      } catch {
        // Ignore transient control error
      }
    },
    [liveRoom, isStudentMode]
  );

  async function handleLaunchLiveRoom() {
    setRoomLoading(true);
    setRoomError(null);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: activity.id, playMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not launch room.');
      setLiveRoom(data.room);
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : 'Could not launch live room.');
    } finally {
      setRoomLoading(false);
    }
  }

  async function handleAdapt(targetTier: DifferentiationTier) {
    setAdaptingTier(targetTier);
    setAdaptError(null);
    try {
      const res = await fetch(`/api/activities/${activity.id}/adapt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not adapt activity.');
      onActivityCreated(data.activity);
    } catch (err) {
      setAdaptError(err instanceof Error ? err.message : 'Adaptation failed.');
    } finally {
      setAdaptingTier(null);
    }
  }

  function updateTeamScore(index: number, delta: number) {
    setTeams((prev) =>
      prev.map((t, i) => (i === index ? { ...t, points: Math.max(0, t.points + delta) } : t))
    );
  }

  function toggleMusic() {
    if (musicPlaying) {
      soundtrack.stop();
      setMusicPlaying(false);
    } else {
      soundtrack.setVolume(musicVolume / 100);
      soundtrack.start(musicTrack);
      setMusicPlaying(true);
    }
  }

  function handleTrackChange(track: MusicTrackId) {
    setMusicTrack(track);
    soundtrack.setTrack(track);
  }

  function handleVolumeChange(val: number) {
    setMusicVolume(val);
    soundtrack.setVolume(val / 100);
  }

  function handleCopyJoinLink() {
    if (!liveRoom) return;
    const url = `${window.location.origin}/?room=${liveRoom.code}`;
    navigator.clipboard?.writeText(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  const groupLeaderboard = useMemo(() => {
    if (!liveRoom) return [];
    const totals = new Map<string, { points: number; members: number }>();
    liveRoom.participants.forEach((p) => {
      const entry = totals.get(p.team) || { points: 0, members: 0 };
      entry.points += p.score;
      entry.members += 1;
      totals.set(p.team, entry);
    });
    return Array.from(totals.entries())
      .map(([teamName, stats]) => ({ teamName, ...stats }))
      .sort((a, b) => b.points - a.points);
  }, [liveRoom]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  function renderPlayer() {
    const commonProps = {
      boardMode,
      largeType,
      readAloudEnabled,
      onProgress: studentSession ? handleStudentProgress : undefined,
    };

    switch (activity.payload.type) {
      case 'sort':
        return <SortPlayer payload={activity.payload} {...commonProps} />;
      case 'sequence':
        return <SequencePlayer payload={activity.payload} {...commonProps} />;
      case 'match':
        return <MatchPlayer payload={activity.payload} {...commonProps} />;
      case 'quiz':
        return (
          <QuizPlayer
            payload={activity.payload}
            {...commonProps}
            onAwardTeamPoint={() => updateTeamScore(selectedTeamIndex, 1)}
          />
        );
      case 'cloze':
        return <ClozePlayer payload={activity.payload} {...commonProps} />;
      case 'bingo':
        return (
          <BingoPlayer
            payload={activity.payload}
            {...commonProps}
            liveRoom={liveRoom}
            isStudentMode={isStudentMode}
            onTeacherControl={handleTeacherControl}
          />
        );
      case 'draw':
        return (
          <DrawPlayer
            payload={activity.payload}
            boardMode={boardMode}
            largeType={largeType}
            liveRoom={liveRoom}
            studentSession={studentSession}
            onTeacherControl={handleTeacherControl}
            onProgress={studentSession ? handleStudentProgress : undefined}
          />
        );
      case 'wordcloud':
        return (
          <WordCloudPlayer
            payload={activity.payload}
            boardMode={boardMode}
            largeType={largeType}
            liveRoom={liveRoom}
            studentSession={studentSession}
            onTeacherControl={handleTeacherControl}
            onProgress={studentSession ? handleStudentProgress : undefined}
          />
        );
      case 'buzzer':
        return (
          <BuzzerPlayer
            payload={activity.payload}
            {...commonProps}
            onAwardSpecificPoints={(pts) => updateTeamScore(selectedTeamIndex, pts)}
          />
        );
      case 'escape':
        return <EscapePlayer payload={activity.payload} {...commonProps} />;
    }
  }

  return (
    <div className="mx-auto max-w-[1380px] px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors min-h-[40px]"
        >
          <ArrowLeft className="h-4 w-4" />
          {isStudentMode ? 'Leave Room' : 'Back to Library'}
        </button>

        {!isStudentMode && onOpenPreview && (
          <button
            type="button"
            onClick={onOpenPreview}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors min-h-[38px] whitespace-nowrap"
          >
            <Pencil className="h-3.5 w-3.5 text-blue-700" />
            Preview & Edit Questions
          </button>
        )}

        {studentSession && (
          <div className="flex flex-wrap items-center gap-2.5 text-sm text-slate-700">
            <StudentCharacterIcon character={studentSession.character} size="sm" />
            <span className="font-semibold text-slate-900">{studentSession.name}</span>
            <span aria-hidden="true">·</span>
            <span>Team {studentSession.team}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-semibold text-blue-700">Room {studentSession.code}</span>
            {liveRoom && (
              <>
                <span aria-hidden="true">·</span>
                <span>{liveRoom.playMode === 'group' ? 'Group Mode' : 'Individual Mode'}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Student Paused Banner */}
      {isStudentMode && liveRoom?.paused && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <Lock className="h-5 w-5 text-amber-700 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Eyes on the Board — Activity Paused</p>
            <p className="text-xs text-amber-800">
              Your teacher has paused submissions for a quick class discussion.
            </p>
          </div>
        </div>
      )}

      {/* Two-Zone Sandbox Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Stage */}
        <section
          className={`lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm transition-colors ${
            calmPaper ? 'calm-paper' : ''
          }`}
        >
          <div className="mb-6 space-y-3 border-b border-slate-200 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <span className="font-semibold text-slate-800">{activity.yearGroup}</span>
                <span aria-hidden="true">·</span>
                <span>{activity.subject}</span>
                <span aria-hidden="true">·</span>
                <span>{FORMAT_META[activity.format].label}</span>
                <span aria-hidden="true">·</span>
                <span>{activity.differentiation}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{activity.estimatedMinutes} mins</span>
                {activity.sourceFileName && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-blue-700">From {activity.sourceFileName}</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  speakText(
                    `${activity.title}. Objectives: ${activity.objectives.join('. ')}`
                  )
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
              >
                <Volume2 className="h-4 w-4" />
                Read Title & Objectives
              </button>
            </div>

            <h1
              className={`font-display font-semibold tracking-tight text-slate-950 text-balance ${
                boardMode || largeType ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
              }`}
            >
              {activity.title}
            </h1>

            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Lesson Objectives
              </p>
              <ul className="space-y-1 text-sm text-slate-700">
                {activity.objectives.map((obj, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-xs text-slate-400 mt-0.5 tabular-nums">
                      0{idx + 1}.
                    </span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <ActivityGuideCard
            format={activity.format}
            isStudentMode={isStudentMode}
            skipped={guideSkipped}
            onSkip={() => setGuideSkipped(true)}
            onShow={() => setGuideSkipped(false)}
          />

          {renderPlayer()}
        </section>

        {/* Teacher & Inclusion Control Deck */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Soundtrack & Audio Controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold text-slate-900">
                <Music className="h-4 w-4 text-blue-700" />
                Classroom Music & Audio
              </h2>
              <button
                type="button"
                onClick={toggleMusic}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors min-h-[36px] ${
                  musicPlaying
                    ? 'bg-blue-700 text-white hover:bg-blue-800'
                    : 'border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                }`}
              >
                {musicPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    Pause Music
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    Play Music
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1">
              {MUSIC_TRACKS.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => handleTrackChange(track.id)}
                  className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors min-h-[34px] whitespace-nowrap ${
                    musicTrack === track.id
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {track.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
                <span>Music Volume</span>
                <span>{musicVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={musicVolume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full accent-blue-700"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !sfxEnabled;
                setSfxEnabled(next);
                soundtrack.setSfxEnabled(next);
              }}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 min-h-[38px]"
            >
              <span>Auto Game Sound Effects</span>
              <span>{sfxEnabled ? 'On' : 'Muted'}</span>
            </button>

            {!isStudentMode && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Play Student Sound Effect
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => soundtrack.playApplause()}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:border-blue-300 transition-colors min-h-[36px] whitespace-nowrap"
                  >
                    Applause
                  </button>
                  <button
                    type="button"
                    onClick={() => soundtrack.playDrumroll()}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:border-blue-300 transition-colors min-h-[36px] whitespace-nowrap"
                  >
                    Drumroll
                  </button>
                  <button
                    type="button"
                    onClick={() => soundtrack.playUnlockFanfare(true)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:border-blue-300 transition-colors min-h-[36px] whitespace-nowrap"
                  >
                    Fanfare
                  </button>
                  <button
                    type="button"
                    onClick={() => soundtrack.playLevelUp()}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:border-blue-300 transition-colors min-h-[36px] whitespace-nowrap"
                  >
                    Level Up
                  </button>
                  <button
                    type="button"
                    onClick={() => soundtrack.playTryAgainBounce()}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:border-blue-300 transition-colors min-h-[36px] whitespace-nowrap"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => soundtrack.playTimerBell(true)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:border-blue-300 transition-colors min-h-[36px] whitespace-nowrap"
                  >
                    Class Bell
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Display & Accessibility Controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Classroom & Inclusion Controls
            </h2>

            {!isStudentMode && (
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setBoardMode(true)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors min-h-[40px] whitespace-nowrap ${
                    boardMode
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Board Mode
                </button>
                <button
                  type="button"
                  onClick={() => setBoardMode(false)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors min-h-[40px] whitespace-nowrap ${
                    !boardMode
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Student View
                </button>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const next = !readAloudEnabled;
                  setReadAloudEnabled(next);
                  if (!next) stopSpeech();
                }}
                className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors min-h-[42px] ${
                  readAloudEnabled
                    ? 'border-blue-600 bg-blue-50 text-blue-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {readAloudEnabled ? (
                    <Volume2 className="h-4 w-4 text-blue-700" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-slate-500" />
                  )}
                  Auto Read Aloud
                </span>
                <span className="text-xs font-semibold">
                  {readAloudEnabled ? 'On' : 'Off'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLargeType((v) => !v)}
                className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors min-h-[42px] ${
                  largeType
                    ? 'border-blue-600 bg-blue-50 text-blue-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Extra-Large Print</span>
                <span className="text-xs font-semibold">{largeType ? 'On' : 'Off'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCalmPaper((v) => !v)}
                className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors min-h-[42px] ${
                  calmPaper
                    ? 'border-blue-600 bg-blue-50 text-blue-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Calm Cream Paper</span>
                <span className="text-xs font-semibold">{calmPaper ? 'On' : 'Off'}</span>
              </button>
            </div>
          </div>

          {/* Teacher Countdown Timer & Team Scoreboard */}
          {!isStudentMode && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold text-slate-900">
                    <Clock className="h-4 w-4 text-blue-700" />
                    Activity Timer
                  </h2>
                  <span
                    className={`font-mono text-2xl font-bold tabular-nums ${
                      classTimerLeft <= 10 && classTimerRunning
                        ? 'text-red-700'
                        : 'text-slate-950'
                    }`}
                  >
                    {formatTimer(classTimerLeft)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[30, 60, 120, 300].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setClassTimerRunning(false);
                        setClassTimerPreset(sec);
                        setClassTimerLeft(sec);
                      }}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold ${
                        classTimerPreset === sec
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setClassTimerRunning((r) => !r)}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    {classTimerRunning ? 'Pause' : 'Start'}
                  </button>
                  <button
                    type="button"
                    aria-label="Reset timer"
                    onClick={() => {
                      setClassTimerRunning(false);
                      setClassTimerLeft(classTimerPreset);
                    }}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Live Adjust Time Controls (works while paused or running) */}
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  <span className="text-xs text-slate-500">Adjust:</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { label: '-30s', delta: -30 },
                      { label: '-10s', delta: -10 },
                      { label: '+10s', delta: 10 },
                      { label: '+30s', delta: 30 },
                      { label: '+1m', delta: 60 },
                      { label: '+5m', delta: 300 },
                    ].map((adj) => (
                      <button
                        key={adj.label}
                        type="button"
                        onClick={() => {
                          setClassTimerLeft((prev) => Math.max(0, prev + adj.delta));
                          if (!classTimerRunning) {
                            setClassTimerPreset((prev) => Math.max(10, prev + adj.delta));
                          }
                        }}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900 tabular-nums"
                      >
                        {adj.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Class Team Scoreboard
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTeams(DEFAULT_TEAMS)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Select a team to highlight it for quick point awards.
                </p>

                <div className="space-y-2">
                  {teams.map((team, idx) => (
                    <div
                      key={team.name}
                      onClick={() => setSelectedTeamIndex(idx)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2 transition-colors ${
                        selectedTeamIndex === idx
                          ? 'border-blue-500 bg-blue-50/50'
                          : 'border-slate-200 bg-slate-50/60'
                      }`}
                    >
                      <span className="text-sm font-semibold text-slate-900">{team.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Subtract point from ${team.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTeamScore(idx, -1);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center font-mono text-base font-semibold text-slate-950 tabular-nums">
                          {team.points}
                        </span>
                        <button
                          type="button"
                          aria-label={`Add point to ${team.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTeamScore(idx, 1);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-600 hover:text-white transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Teacher Live Room + Mode Controls */}
          {!isStudentMode && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Live Student Room
                  </h2>
                  {liveRoom && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <Radio className="h-3.5 w-3.5" />
                      Active
                    </span>
                  )}
                </div>

                {/* Individual vs Group Play Selector */}
                <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPlayMode('individual');
                      if (liveRoom) handleTeacherControl({ playMode: 'individual' });
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors min-h-[36px] ${
                      (liveRoom?.playMode ?? playMode) === 'individual'
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Individual Play
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlayMode('group');
                      if (liveRoom) handleTeacherControl({ playMode: 'group' });
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors min-h-[36px] ${
                      (liveRoom?.playMode ?? playMode) === 'group'
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Group Battle
                  </button>
                </div>

                {!liveRoom ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      Students can play individually or compete in table groups on tablets and laptops.
                    </p>
                    {roomError && <p className="text-xs text-red-700">{roomError}</p>}
                    <button
                      type="button"
                      disabled={roomLoading}
                      onClick={handleLaunchLiveRoom}
                      className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors min-h-[44px]"
                    >
                      {roomLoading ? 'Creating Room…' : 'Launch Live Room Code'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                      <div>
                        <p className="text-xs font-semibold text-blue-800">Room Join Code</p>
                        <p className="font-mono text-3xl font-bold tracking-widest text-blue-950 tabular-nums mt-0.5">
                          {liveRoom.code}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyJoinLink}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 min-h-[40px] whitespace-nowrap"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedCode ? 'Copied Link' : 'Copy Link'}
                      </button>
                    </div>

                    {/* Teacher Master Controls */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleTeacherControl({ paused: !liveRoom.paused })}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold min-h-[38px] ${
                          liveRoom.paused
                            ? 'border-amber-400 bg-amber-50 text-amber-950'
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <Lock className="h-3.5 w-3.5" />
                        {liveRoom.paused ? 'Resume Class' : 'Pause Screens'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTeacherControl({ resetRoom: true })}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[38px]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset Scores
                      </button>
                    </div>

                    {onOpenDashboard && (
                      <button
                        type="button"
                        onClick={() => onOpenDashboard(liveRoom.code)}
                        className="w-full rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors min-h-[40px]"
                      >
                        Open Live Teacher Dashboard →
                      </button>
                    )}

                    {/* Group Standings when in Group Mode */}
                    {liveRoom.playMode === 'group' && groupLeaderboard.length > 0 && (
                      <div className="space-y-1.5 border-t border-slate-100 pt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Live Group Standings
                        </p>
                        {groupLeaderboard.map((g) => (
                          <div
                            key={g.teamName}
                            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs"
                          >
                            <span className="font-semibold text-slate-900">
                              Team {g.teamName} ({g.members})
                            </span>
                            <span className="font-mono font-semibold text-blue-800 tabular-nums">
                              {g.points} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          Connected Students ({liveRoom.participants.length})
                        </span>
                        <span className="tabular-nums">
                          {liveRoom.participants.filter((p) => p.completed).length} finished
                        </span>
                      </div>

                      {liveRoom.participants.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 py-4 px-3 text-center text-xs text-slate-500">
                          Students can open Live Join and enter code{' '}
                          <strong className="font-mono text-slate-900">{liveRoom.code}</strong>
                        </p>
                      ) : (
                        <div className="max-h-52 overflow-y-auto space-y-2">
                          {liveRoom.participants.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <StudentCharacterIcon character={p.character} size="sm" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 truncate">
                                    {p.name}{' '}
                                    <span className="font-normal text-slate-500">· {p.team}</span>
                                  </p>
                                  <p className="text-slate-600 mt-0.5 truncate">{p.summary}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                {p.completed ? (
                                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Done
                                  </span>
                                ) : (
                                  <span className="font-mono text-slate-600 tabular-nums">
                                    {p.score}/{p.total || '—'}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Teacher & Inclusion Notes
                </h2>
                <div className="space-y-3 text-sm text-slate-700">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Classroom Facilitation
                    </p>
                    <p className="mt-1 leading-relaxed">{activity.teacherTip}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Every Child Included
                    </p>
                    <p className="mt-1 leading-relaxed">{activity.inclusionNote}</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Adapt This Activity
                  </p>
                  {adaptError && <p className="text-xs text-red-700">{adaptError}</p>}
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      disabled={adaptingTier !== null}
                      onClick={() => handleAdapt('Visual & EAL Support')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50 min-h-[40px]"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-blue-700" />
                      {adaptingTier === 'Visual & EAL Support'
                        ? 'Adapting for Support…'
                        : 'Create Visual & EAL Support Version'}
                    </button>
                    <button
                      type="button"
                      disabled={adaptingTier !== null}
                      onClick={() => handleAdapt('Stretch & Challenge')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50 min-h-[40px]"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-blue-700" />
                      {adaptingTier === 'Stretch & Challenge'
                        ? 'Adapting for Stretch…'
                        : 'Create Stretch & Challenge Version'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

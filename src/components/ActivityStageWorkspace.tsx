import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  Music,
  Pause,
  Pencil,
  Play,
  Plus,
  Printer,
  QrCode,
  Radio,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  FORMAT_META,
  TIER_LABELS,
  speechLangForSubject,
  yearLabel,
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
import { setSpeechLanguage, speakText, stopSpeech } from '../utils/speech.ts';
import { openWorksheet } from '../utils/printWorksheet.ts';
import { pupilJoinAddress, pupilJoinUrl } from '../utils/joinLink.ts';
import { MUSIC_TRACKS, soundtrack, type MusicTrackId } from '../utils/soundtrack.ts';
import { ActivityGuideCard, useGuideSeen } from './ActivityGuideCard.tsx';
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
  const [guideSkipped, skipGuide, showGuide] = useGuideSeen(activity.format);

  // Simpler screen: "Show on board" fills the screen with only the game, timer and team points.
  const [onBoard, setOnBoard] = useState(false);
  const boardRef = useRef<HTMLElement | null>(null);
  // Music, sound effects, display options, adapting and notes live in one "Class tools" panel.
  const [toolsOpen, setToolsOpen] = useState(false);
  // Full-screen QR/code screen for pupils joining on devices.
  const [showJoinScreen, setShowJoinScreen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  // Read-aloud in the right language (e.g. French voice for French lessons, British English otherwise).
  useEffect(() => {
    setSpeechLanguage(speechLangForSubject(activity.subject));
  }, [activity.subject]);

  useEffect(() => {
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
      if (!res.ok) throw new Error(data.error || 'Could not start the room.');
      setLiveRoom(data.room);
      setShowJoinScreen(true);
    } catch (err) {
      setRoomError(
        err instanceof Error ? err.message : 'Could not start the room. Check the internet connection.'
      );
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
    navigator.clipboard?.writeText(pupilJoinUrl(liveRoom.code)).catch(() => undefined);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  // QR code for the join screen (pupils scan it; the room code is filled in for them).
  const liveCode = liveRoom?.code ?? null;
  useEffect(() => {
    if (!liveCode || isStudentMode) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(pupilJoinUrl(liveCode), { margin: 1, width: 480, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => setQrDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [liveCode, isStudentMode]);

  // Board mode: try real full screen; fall back to a full-window view if the browser says no.
  function enterBoard() {
    setToolsOpen(false);
    setOnBoard(true);
    const el = boardRef.current;
    try {
      const p = el?.requestFullscreen?.();
      if (p && typeof p.catch === 'function') p.catch(() => undefined);
    } catch {
      // full-window view still works
    }
  }

  function exitBoard() {
    setOnBoard(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  }

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setOnBoard(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOnBoard(false);
        setToolsOpen(false);
        setShowJoinScreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Whenever board mode ends (button, Esc, or changing game), make sure full screen ends too,
  // otherwise the browser can keep the game panel on top of everything.
  useEffect(() => {
    if (!onBoard && document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }, [onBoard]);

  useEffect(() => {
    document.body.style.overflow = onBoard || showJoinScreen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [onBoard, showJoinScreen]);

  function handlePrint() {
    if (!openWorksheet(activity)) {
      setNotice('Your browser blocked the worksheet window. Allow pop-ups for this site and try again.');
    }
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
      boardMode: boardMode || onBoard,
      largeType: largeType || onBoard,
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
            boardMode={boardMode || onBoard}
            largeType={largeType || onBoard}
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
            boardMode={boardMode || onBoard}
            largeType={largeType || onBoard}
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

  const tealBtn =
    'inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 hover:bg-slate-50 transition-colors min-h-[48px] whitespace-nowrap';

  function renderTimer(compact: boolean) {
    return (
      <div className={compact ? 'flex items-center gap-2' : 'space-y-3'}>
        {!compact && (
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-slate-900">
              <Clock className="h-5 w-5 text-blue-700" />
              Timer
            </h2>
          </div>
        )}
        <span
          role="timer"
          aria-live="off"
          className={`font-mono font-bold tabular-nums ${compact ? 'text-4xl' : 'block text-center text-5xl'} ${
            classTimerLeft === 0 ? 'text-red-700' : classTimerLeft <= 10 && classTimerRunning ? 'text-red-700' : 'text-slate-950'
          }`}
        >
          {formatTimer(classTimerLeft)}
        </span>
        <div className={`flex items-center gap-1.5 ${compact ? '' : 'justify-center flex-wrap'}`}>
          {!compact &&
            [60, 120, 300].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => {
                  setClassTimerRunning(false);
                  setClassTimerPreset(sec);
                  setClassTimerLeft(sec);
                }}
                className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold ${
                  classTimerPreset === sec ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                {sec / 60} min
              </button>
            ))}
          <button
            type="button"
            onClick={() => {
              if (classTimerLeft === 0) setClassTimerLeft(classTimerPreset);
              setClassTimerRunning((r) => !r);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 min-h-[40px]"
          >
            {classTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {classTimerRunning ? 'Pause' : 'Start'}
          </button>
          <button
            type="button"
            onClick={() => setClassTimerLeft((prev) => prev + 60)}
            className="rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 min-h-[40px]"
          >
            +1 min
          </button>
          <button
            type="button"
            aria-label="Reset timer"
            title="Reset timer"
            onClick={() => {
              setClassTimerRunning(false);
              setClassTimerLeft(classTimerPreset);
            }}
            className="rounded-lg border-2 border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 min-h-[40px]"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  function renderTeams(compact: boolean) {
    if (compact) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          {teams.map((team, idx) => (
            <button
              key={team.name}
              type="button"
              onClick={() => {
                setSelectedTeamIndex(idx);
                updateTeamScore(idx, 1);
              }}
              title={`Give ${team.name} a point`}
              className={`inline-flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-base font-semibold ${
                selectedTeamIndex === idx ? 'border-blue-600 bg-blue-50 text-blue-950' : 'border-slate-200 bg-white text-slate-800'
              }`}
            >
              {team.name}
              <span className="font-mono text-xl tabular-nums">{team.points}</span>
              <Plus className="h-4 w-4 text-blue-700" />
            </button>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900">Team points</h2>
          <button
            type="button"
            onClick={() => setTeams(DEFAULT_TEAMS)}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Start again
          </button>
        </div>
        <div className="space-y-2">
          {teams.map((team, idx) => (
            <div
              key={team.name}
              onClick={() => setSelectedTeamIndex(idx)}
              className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-3.5 py-2 transition-colors ${
                selectedTeamIndex === idx ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              <span className="text-base font-semibold text-slate-900">{team.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Take a point from ${team.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTeamScore(idx, -1);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-9 text-center font-mono text-lg font-semibold text-slate-950 tabular-nums">{team.points}</span>
                <button
                  type="button"
                  aria-label={`Give a point to ${team.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTeamScore(idx, 1);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {(activity.format === 'quiz' || activity.format === 'buzzer') && (
          <p className="text-sm text-slate-500">Tap a team to choose who gets the points from the game.</p>
        )}
      </div>
    );
  }

  function renderLiveCard() {
    if (!liveRoom) return null;
    const finished = liveRoom.participants.filter((p) => p.completed).length;
    return (
      <div className="rounded-2xl border-2 border-blue-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900">Pupils on devices</h2>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <Radio className="h-4 w-4" />
            Live
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowJoinScreen(true)}
          className="flex w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-left hover:bg-blue-100"
        >
          <span>
            <span className="block text-sm font-semibold text-blue-800">Code</span>
            <span className="block font-mono text-3xl font-bold tracking-widest text-blue-950">{liveRoom.code}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-800">
            <QrCode className="h-5 w-5" />
            Show QR code
          </span>
        </button>

        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="How pupils play">
          {(
            [
              ['group', 'In teams'],
              ['individual', 'On their own'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={liveRoom.playMode === mode}
              onClick={() => {
                setPlayMode(mode);
                handleTeacherControl({ playMode: mode });
              }}
              className={`rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors ${
                liveRoom.playMode === mode ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleTeacherControl({ paused: !liveRoom.paused })}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-semibold min-h-[44px] ${
              liveRoom.paused ? 'border-amber-400 bg-amber-50 text-amber-950' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Lock className="h-4 w-4" />
            {liveRoom.paused ? 'Unfreeze' : 'Freeze screens'}
          </button>
          <button
            type="button"
            onClick={() => handleTeacherControl({ resetRoom: true })}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
          >
            <RotateCcw className="h-4 w-4" />
            Play again
          </button>
        </div>

        {liveRoom.playMode === 'group' && groupLeaderboard.length > 0 && (
          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            <p className="text-sm font-semibold text-slate-600">Team scores</p>
            {groupLeaderboard.map((g) => (
              <div key={g.teamName} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                <span className="font-semibold text-slate-900">
                  {g.teamName} ({g.members})
                </span>
                <span className="font-mono font-semibold text-blue-800 tabular-nums">{g.points}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {liveRoom.participants.length} joined
            </span>
            <span className="tabular-nums">{finished} finished</span>
          </div>
          {liveRoom.participants.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 py-4 px-3 text-center text-sm text-slate-500">
              Waiting for pupils… They go to <strong className="text-slate-900">{pupilJoinAddress()}</strong> and type{' '}
              <strong className="font-mono text-slate-900">{liveRoom.code}</strong>
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5">
              {liveRoom.participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <StudentCharacterIcon character={p.character} size="sm" />
                    <p className="font-semibold text-slate-900 truncate">
                      {p.name} <span className="font-normal text-slate-500">· {p.team}</span>
                    </p>
                  </div>
                  {p.completed ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                      Done
                    </span>
                  ) : (
                    <span className="font-mono text-slate-600 tabular-nums shrink-0">
                      {p.score}/{p.total || '–'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {onOpenDashboard && (
          <button
            type="button"
            onClick={() => onOpenDashboard(liveRoom.code)}
            className="w-full text-sm font-semibold text-blue-700 hover:text-blue-800 min-h-[36px]"
          >
            See each pupil's answers →
          </button>
        )}
      </div>
    );
  }

  function toggleRow(label: string, on: boolean, onClick: () => void, help?: string) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onClick}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
          on ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
        }`}
      >
        <span>
          <span className="block text-base font-semibold text-slate-900">{label}</span>
          {help && <span className="block text-sm text-slate-600">{help}</span>}
        </span>
        <span
          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-blue-700' : 'bg-slate-300'}`}
          aria-hidden="true"
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
        </span>
      </button>
    );
  }

  function renderToolsPanel() {
    return (
      <div className="fixed inset-0 z-[55] flex justify-end" role="dialog" aria-modal="true" aria-label="Class tools">
        <button type="button" aria-label="Close class tools" className="absolute inset-0 bg-slate-950/30" onClick={() => setToolsOpen(false)} />
        <div className="relative h-full w-full max-w-md overflow-y-auto bg-white p-5 sm:p-6 shadow-2xl space-y-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-slate-950">Class tools</h2>
            <button
              type="button"
              onClick={() => setToolsOpen(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 px-3 py-2 text-base font-semibold text-slate-700"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Reading and display</h3>
            {toggleRow('Read questions aloud', readAloudEnabled, () => {
              const next = !readAloudEnabled;
              setReadAloudEnabled(next);
              if (!next) stopSpeech();
            }, 'Each question is read out automatically')}
            {toggleRow('Extra-large text', largeType, () => setLargeType((v) => !v))}
            {toggleRow('Cream background', calmPaper, () => setCalmPaper((v) => !v), 'Less glare; can help pupils with dyslexia')}
            <button
              type="button"
              onClick={() => speakText(`${activity.title}. ${activity.objectives.join('. ')}`)}
              className="inline-flex items-center gap-2 text-base font-semibold text-blue-700 hover:text-blue-800 min-h-[40px]"
            >
              <Volume2 className="h-5 w-5" />
              Read the title and objectives aloud now
            </button>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Music</h3>
            <button
              type="button"
              onClick={toggleMusic}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-semibold min-h-[48px] ${
                musicPlaying ? 'bg-blue-700 text-white hover:bg-blue-800' : 'border-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              {musicPlaying ? <Pause className="h-5 w-5" /> : <Music className="h-5 w-5" />}
              {musicPlaying ? 'Stop music' : 'Play background music'}
            </button>
            {musicPlaying && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {MUSIC_TRACKS.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => handleTrackChange(track.id)}
                      className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${
                        musicTrack === track.id ? 'border-blue-600 bg-blue-50 text-blue-950' : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {track.label}
                    </button>
                  ))}
                </div>
                <label className="block space-y-1">
                  <span className="flex justify-between text-sm text-slate-600 tabular-nums">
                    <span>Volume</span>
                    <span>{musicVolume}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={musicVolume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-full accent-blue-700"
                  />
                </label>
              </>
            )}
            {toggleRow('Game sounds', sfxEnabled, () => {
              const next = !sfxEnabled;
              setSfxEnabled(next);
              soundtrack.setSfxEnabled(next);
            }, 'Little sounds for right and wrong answers')}
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ['Applause', () => soundtrack.playApplause()],
                  ['Drumroll', () => soundtrack.playDrumroll()],
                  ['Fanfare', () => soundtrack.playUnlockFanfare(true)],
                  ['Level up', () => soundtrack.playLevelUp()],
                  ['Try again', () => soundtrack.playTryAgainBounce()],
                  ['Bell', () => soundtrack.playTimerBell(true)],
                ] as [string, () => void][]
              ).map(([label, play]) => (
                <button
                  key={label}
                  type="button"
                  onClick={play}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:border-blue-300 min-h-[40px]"
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Make another version of this game</h3>
            {adaptError && <p className="text-sm text-red-700">{adaptError}</p>}
            <button
              type="button"
              disabled={adaptingTier !== null}
              onClick={() => handleAdapt('Visual & EAL Support')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 py-3 text-base font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 text-blue-700" />
              {adaptingTier === 'Visual & EAL Support' ? 'Making an easier version…' : 'Easier version (extra support, EAL)'}
            </button>
            <button
              type="button"
              disabled={adaptingTier !== null}
              onClick={() => handleAdapt('Stretch & Challenge')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 py-3 text-base font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 text-blue-700" />
              {adaptingTier === 'Stretch & Challenge' ? 'Making a harder version…' : 'Harder version (extra challenge)'}
            </button>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Teaching notes</h3>
            <p className="text-base leading-relaxed text-slate-700">{activity.teacherTip}</p>
            <p className="text-base leading-relaxed text-slate-700">{activity.inclusionNote}</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Layout</h3>
            {toggleRow('Big board layout', boardMode, () => setBoardMode((v) => !v), 'Larger buttons and text for the projector')}
          </section>
        </div>
      </div>
    );
  }

  function renderJoinScreen() {
    if (!liveRoom) return null;
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-white" role="dialog" aria-modal="true" aria-label="Pupils join screen">
        <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center gap-8 p-6 sm:p-10">
          <h2 className="text-center font-display text-4xl sm:text-5xl font-bold text-slate-950">Join the game</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12">
            <div className="flex flex-col items-center gap-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR code to join with code ${liveRoom.code}`} className="h-64 w-64 sm:h-80 sm:w-80 rounded-2xl border-4 border-slate-900 bg-white p-2" />
              ) : (
                <div className="h-64 w-64 sm:h-80 sm:w-80 rounded-2xl border-4 border-dashed border-slate-300" />
              )}
              <p className="text-xl font-semibold text-slate-700">Scan with a tablet camera</p>
            </div>
            <div className="space-y-6 text-center md:text-left">
              <p className="text-2xl text-slate-700">
                or go to
                <span className="mt-1 block break-all font-semibold text-slate-950 text-3xl">{pupilJoinAddress()}</span>
              </p>
              <p className="text-2xl text-slate-700">
                and type the code
                <span className="mt-2 block font-mono text-7xl sm:text-8xl font-bold tracking-[0.2em] text-blue-800">{liveRoom.code}</span>
              </p>
            </div>
          </div>

          <div className="space-y-3 text-center">
            <p className="text-2xl font-semibold text-slate-900" aria-live="polite">
              {liveRoom.participants.length === 0
                ? 'Waiting for pupils to join…'
                : `${liveRoom.participants.length} ${liveRoom.participants.length === 1 ? 'pupil has' : 'pupils have'} joined`}
            </p>
            {liveRoom.participants.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {liveRoom.participants.slice(-40).map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-lg font-semibold text-slate-800">
                    <StudentCharacterIcon character={p.character} size="sm" />
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowJoinScreen(false)}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-8 py-4 text-xl font-semibold text-white hover:bg-blue-800 min-h-[60px]"
            >
              <Play className="h-6 w-6" />
              Everyone's in: start the game
            </button>
            <button type="button" onClick={handleCopyJoinLink} className={tealBtn}>
              {copiedCode ? 'Link copied' : 'Copy join link'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------- Layout -------------------------------- */
  return (
    <div className="mx-auto max-w-[1380px] px-4 sm:px-6 py-5 sm:py-6 space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-base font-semibold text-slate-600 hover:text-slate-950 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="h-5 w-5" />
          {isStudentMode ? 'Leave game' : 'Back'}
        </button>

        {!isStudentMode && (
          <div className="flex flex-wrap items-center gap-2">
            {onOpenPreview && (
              <button type="button" onClick={onOpenPreview} className={tealBtn}>
                <Pencil className="h-4 w-4 text-blue-700" />
                Edit questions
              </button>
            )}
            <button type="button" onClick={handlePrint} className={tealBtn}>
              <Printer className="h-4 w-4 text-blue-700" />
              Print worksheet
            </button>
            <button type="button" onClick={() => setToolsOpen(true)} className={tealBtn} aria-haspopup="dialog">
              <SlidersHorizontal className="h-4 w-4 text-blue-700" />
              Class tools
            </button>
            {liveRoom ? (
              <button type="button" onClick={() => setShowJoinScreen(true)} className={tealBtn}>
                <QrCode className="h-4 w-4 text-blue-700" />
                Join code {liveRoom.code}
              </button>
            ) : (
              <button type="button" disabled={roomLoading} onClick={handleLaunchLiveRoom} className={tealBtn}>
                <QrCode className="h-4 w-4 text-blue-700" />
                {roomLoading ? 'Starting…' : 'Let pupils join on devices'}
              </button>
            )}
            <button
              type="button"
              onClick={enterBoard}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-base font-semibold text-white hover:bg-blue-800 min-h-[48px] whitespace-nowrap"
            >
              <Maximize2 className="h-5 w-5" />
              Show on board
            </button>
          </div>
        )}

        {studentSession && (
          <div className="flex flex-wrap items-center gap-2.5 text-base text-slate-700">
            <StudentCharacterIcon character={studentSession.character} size="sm" />
            <span className="font-semibold text-slate-900">{studentSession.name}</span>
            {liveRoom?.playMode !== 'individual' && (
              <>
                <span aria-hidden="true">·</span>
                <span>Team {studentSession.team}</span>
              </>
            )}
          </div>
        )}
      </div>

      {roomError && (
        <p role="alert" className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-base text-red-900">
          {roomError}
        </p>
      )}
      {notice && (
        <p role="alert" className="flex items-center justify-between gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-base text-amber-950">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0">
            <X className="h-4 w-4" />
          </button>
        </p>
      )}

      {isStudentMode && liveRoom?.paused && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950">
          <Lock className="h-6 w-6 text-amber-700 shrink-0" />
          <p className="font-semibold text-lg">Eyes on the board, please. Your teacher has paused the game.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* The game. On "Show on board" this same panel fills the screen (so the game keeps its place). */}
        <section
          ref={boardRef}
          aria-label={onBoard ? 'Game on board' : 'Game'}
          className={
            onBoard
              ? `fixed inset-0 z-50 overflow-y-auto bg-white p-4 sm:p-8 ${calmPaper ? 'calm-paper' : ''}`
              : `${isStudentMode ? 'lg:col-span-12' : 'lg:col-span-9'} rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm transition-colors ${
                  calmPaper ? 'calm-paper' : ''
                }`
          }
        >
          {onBoard && (
            <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-b-2 border-slate-200 pb-4">
              <h1 className="w-full font-display text-3xl sm:text-4xl font-semibold text-slate-950 text-balance">{activity.title}</h1>
              {renderTimer(true)}
              {renderTeams(true)}
              <button
                type="button"
                onClick={exitBoard}
                className="ml-auto inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 hover:bg-slate-50 min-h-[48px]"
              >
                <Minimize2 className="h-5 w-5" />
                Exit board (Esc)
              </button>
            </div>
          )}

          {!onBoard && (
            <div className="mb-5 space-y-2 border-b border-slate-200 pb-5">
              {!isStudentMode && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className="font-semibold text-slate-800">{yearLabel(activity)}</span>
                <span aria-hidden="true">·</span>
                <span>{activity.subject}</span>
                <span aria-hidden="true">·</span>
                <span>{FORMAT_META[activity.format].label}</span>
                {activity.differentiation !== 'All Learners' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{TIER_LABELS[activity.differentiation]?.label}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">about {activity.estimatedMinutes} mins</span>
              </div>
              )}
              <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 text-balance">{activity.title}</h1>
              {!isStudentMode && activity.objectives.length > 0 && (
                <p className="text-base text-slate-700">
                  <span className="font-semibold">We are learning to: </span>
                  {activity.objectives.join(' · ')}
                </p>
              )}
            </div>
          )}

          {!onBoard && (
            <ActivityGuideCard
              format={activity.format}
              isStudentMode={isStudentMode}
              skipped={guideSkipped}
              onSkip={skipGuide}
              onShow={showGuide}
            />
          )}

          {isStudentMode && (
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={readAloudEnabled}
                onClick={() => {
                  const next = !readAloudEnabled;
                  setReadAloudEnabled(next);
                  if (!next) stopSpeech();
                }}
                className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-base font-semibold ${
                  readAloudEnabled ? 'border-blue-600 bg-blue-50 text-blue-950' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                {readAloudEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                Read to me
              </button>
              <button
                type="button"
                aria-pressed={largeType}
                onClick={() => setLargeType((v) => !v)}
                className={`rounded-xl border-2 px-4 py-2 text-base font-semibold ${
                  largeType ? 'border-blue-600 bg-blue-50 text-blue-950' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                Bigger text
              </button>
            </div>
          )}

          <div>{renderPlayer()}</div>
        </section>

        {!isStudentMode && !onBoard && (
          <aside className="lg:col-span-3 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">{renderTimer(false)}</div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">{renderTeams(false)}</div>
            {renderLiveCard()}
          </aside>
        )}
      </div>

      {toolsOpen && !isStudentMode && renderToolsPanel()}
      {showJoinScreen && !isStudentMode && renderJoinScreen()}
    </div>
  );
}

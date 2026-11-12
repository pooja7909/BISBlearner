import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import {
  FORMAT_META,
  type ClassroomActivity,
  type LiveRoom,
  type PlayMode,
  type RoomParticipant,
} from '../types.ts';
import { StudentCharacterIcon } from './StudentCharacterIcon.tsx';

interface SessionBundle {
  room: LiveRoom;
  activity: ClassroomActivity;
}

interface LiveTeacherDashboardProps {
  activities: ClassroomActivity[];
  initialRoomCode?: string | null;
  onOpenActivity: (activity: ClassroomActivity, roomCode?: string) => void;
  onOpenStudentJoin: (code?: string) => void;
}

type StatusFilter = 'all' | 'completed' | 'in_progress';
type SortField = 'name' | 'team' | 'completed' | 'score' | 'updatedAt';

function getPercentage(p: RoomParticipant): number {
  if (!p.total || p.total <= 0) return 0;
  return Math.min(100, Math.round((p.score / p.total) * 100));
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function LiveTeacherDashboard({
  activities,
  initialRoomCode,
  onOpenActivity,
  onOpenStudentJoin,
}: LiveTeacherDashboardProps) {
  const [sessions, setSessions] = useState<SessionBundle[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(
    initialRoomCode ? initialRoomCode.toUpperCase() : null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Quick-launch state when starting a new live session from the dashboard
  const [launchActivityId, setLaunchActivityId] = useState<string>(
    activities[0]?.id ?? ''
  );
  const [launchPlayMode, setLaunchPlayMode] = useState<PlayMode>('group');
  const [launching, setLaunching] = useState(false);

  // Table filter & sort state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!launchActivityId && activities[0]?.id) {
      setLaunchActivityId(activities[0].id);
    }
  }, [activities, launchActivityId]);

  useEffect(() => {
    if (initialRoomCode) {
      setSelectedCode(initialRoomCode.toUpperCase());
    }
  }, [initialRoomCode]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = (await res.json()) as { sessions?: SessionBundle[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not load live sessions.');
      const list = Array.isArray(data.sessions) ? data.sessions : [];
      setSessions(list);
      setLastSyncedAt(new Date().toLocaleTimeString());
      setError(null);

      setSelectedCode((prev) => {
        if (prev && list.some((s) => s.room.code === prev)) return prev;
        return list[0]?.room.code ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh live sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const id = window.setInterval(fetchSessions, 2000);
    return () => window.clearInterval(id);
  }, [fetchSessions]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.room.code === selectedCode) ?? sessions[0] ?? null,
    [sessions, selectedCode]
  );

  async function handleStartSession() {
    if (!launchActivityId) return;
    setLaunching(true);
    setError(null);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: launchActivityId,
          playMode: launchPlayMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start session.');
      setSelectedCode(data.room.code);
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session.');
    } finally {
      setLaunching(false);
    }
  }

  async function handleControl(action: Record<string, unknown>) {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/rooms/${activeSession.room.code}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });
      if (res.ok) {
        await fetchSessions();
      }
    } catch {
      // Ignore transient control failure
    }
  }

  async function handleEndSession(code: string) {
    try {
      const res = await fetch(`/api/rooms/${code}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchSessions();
      }
    } catch {
      // Ignore transient error
    }
  }

  function handleCopyLink(code: string) {
    const url = `${window.location.origin}/?room=${code}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleExportCsv() {
    if (!activeSession) return;
    const headers = ['Student', 'Team', 'Status', 'Score', 'Total', 'Accuracy %', 'Progress', 'Updated'];
    const rows = activeSession.room.participants.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.team.replace(/"/g, '""')}"`,
      p.completed ? 'Completed' : 'In Progress',
      String(p.score),
      String(p.total),
      `${getPercentage(p)}%`,
      `"${p.summary.replace(/"/g, '""')}"`,
      formatTime(p.updatedAt),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `room-${activeSession.room.code}-results.csv`;
    link.click();
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc((v) => !v);
    } else {
      setSortField(field);
      setSortAsc(field === 'name' || field === 'team');
    }
  }

  const participants = activeSession?.room.participants ?? [];

  // Aggregate Class Metrics
  const aggregated = useMemo(() => {
    const totalStudents = participants.length;
    const completedCount = participants.filter((p) => p.completed).length;
    const completionRate =
      totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

    const scoredParticipants = participants.filter((p) => p.total > 0);
    const avgAccuracy =
      scoredParticipants.length > 0
        ? Math.round(
            scoredParticipants.reduce((acc, p) => acc + getPercentage(p), 0) /
              scoredParticipants.length
          )
        : 0;
    const avgPoints =
      totalStudents > 0
        ? Math.round(
            (participants.reduce((acc, p) => acc + p.score, 0) / totalStudents) * 10
          ) / 10
        : 0;

    const teamMap = new Map<
      string,
      { team: string; members: number; completed: number; totalScore: number; totalPossible: number }
    >();
    participants.forEach((p) => {
      const curr = teamMap.get(p.team) || {
        team: p.team,
        members: 0,
        completed: 0,
        totalScore: 0,
        totalPossible: 0,
      };
      curr.members += 1;
      if (p.completed) curr.completed += 1;
      curr.totalScore += p.score;
      curr.totalPossible += p.total;
      teamMap.set(p.team, curr);
    });

    const teams = Array.from(teamMap.values()).sort((a, b) => b.totalScore - a.totalScore);
    const topStudent = [...participants].sort((a, b) => b.score - a.score)[0] ?? null;

    return {
      totalStudents,
      completedCount,
      completionRate,
      avgAccuracy,
      avgPoints,
      teams,
      topStudent,
    };
  }, [participants]);

  const availableTeams = useMemo(() => {
    const set = new Set(participants.map((p) => p.team));
    return Array.from(set).sort();
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = participants.filter((p) => {
      if (statusFilter === 'completed' && !p.completed) return false;
      if (statusFilter === 'in_progress' && p.completed) return false;
      if (teamFilter !== 'ALL' && p.team !== teamFilter) return false;
      if (q) {
        const hay = `${p.name} ${p.team} ${p.summary}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'team') cmp = a.team.localeCompare(b.team);
      else if (sortField === 'completed') cmp = Number(a.completed) - Number(b.completed);
      else if (sortField === 'score') cmp = a.score - b.score;
      else cmp = a.updatedAt.localeCompare(b.updatedAt);
      return sortAsc ? cmp : -cmp;
    });
  }, [participants, search, statusFilter, teamFilter, sortField, sortAsc]);

  return (
    <div className="mx-auto max-w-[1380px] px-4 sm:px-6 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-950">
            Live Teacher Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time completion status, accuracy, and team standings across active classroom sessions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {lastSyncedAt && (
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              Synced {lastSyncedAt}
            </span>
          )}
          <button
            type="button"
            onClick={fetchSessions}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[38px] whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      )}

      {/* Session Switcher + Quick Start Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        {sessions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 mr-1">
              Active Sessions ({sessions.length}):
            </span>
            {sessions.map(({ room, activity }) => {
              const isSelected = activeSession?.room.code === room.code;
              return (
                <button
                  key={room.code}
                  type="button"
                  onClick={() => setSelectedCode(room.code)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors min-h-[38px] whitespace-nowrap ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-950'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-mono font-bold">{room.code}</span>
                  <span aria-hidden="true">·</span>
                  <span className="max-w-[180px] truncate">{activity.title}</span>
                  <span className="font-mono text-slate-500 tabular-nums">
                    ({room.participants.length})
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-sm text-slate-600">
            No active live rooms yet. Start one on the right to monitor students live.
          </span>
        )}

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            aria-label="Choose activity for new live session"
            value={launchActivityId}
            onChange={(e) => setLaunchActivityId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 max-w-[260px] min-h-[38px]"
          >
            {activities.map((act) => (
              <option key={act.id} value={act.id}>
                {act.yearGroup} · {act.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Choose play mode"
            value={launchPlayMode}
            onChange={(e) => setLaunchPlayMode(e.target.value as PlayMode)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-900 min-h-[38px]"
          >
            <option value="group">Group Battle</option>
            <option value="individual">Individual</option>
          </select>
          <button
            type="button"
            disabled={launching || !launchActivityId}
            onClick={handleStartSession}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 min-h-[38px] whitespace-nowrap"
          >
            <Play className="h-3.5 w-3.5" />
            {launching ? 'Starting…' : 'Start New Room'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-28 rounded-2xl border border-slate-200 bg-white animate-pulse" />
          <div className="h-64 rounded-2xl border border-slate-200 bg-white animate-pulse" />
        </div>
      ) : !activeSession ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <Users className="mx-auto h-9 w-9 text-slate-400" />
          <h2 className="font-display text-xl font-semibold text-slate-900">
            No Active Classroom Session Running
          </h2>
          <p className="mx-auto max-w-md text-sm text-slate-600">
            Select any activity above and click <strong>Start New Room</strong> (or click{' '}
            <strong>Launch Live Room Code</strong> from inside an activity) to track student scores and completion in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Session Summary & Teacher Master Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 p-5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="font-mono text-sm font-bold text-blue-700">
                    Room {activeSession.room.code}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeSession.activity.yearGroup}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeSession.activity.subject}</span>
                  <span aria-hidden="true">·</span>
                  <span>{FORMAT_META[activeSession.activity.format].label}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {activeSession.room.playMode === 'group' ? 'Group Battle' : 'Individual Play'}
                  </span>
                </div>
                <h2 className="font-display text-xl font-semibold text-slate-950">
                  {activeSession.activity.title}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyLink(activeSession.room.code)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[38px] whitespace-nowrap"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedLink ? 'Copied Join Link' : 'Copy Join Link'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleControl({
                      playMode:
                        activeSession.room.playMode === 'group' ? 'individual' : 'group',
                    })
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[38px] whitespace-nowrap"
                >
                  Switch to{' '}
                  {activeSession.room.playMode === 'group' ? 'Individual' : 'Group Mode'}
                </button>
                <button
                  type="button"
                  onClick={() => handleControl({ paused: !activeSession.room.paused })}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold min-h-[38px] whitespace-nowrap ${
                    activeSession.room.paused
                      ? 'border-amber-400 bg-amber-50 text-amber-950'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" />
                  {activeSession.room.paused ? 'Resume Class' : 'Pause Screens'}
                </button>
                <button
                  type="button"
                  onClick={() => handleControl({ resetRoom: true })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[38px] whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Scores
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onOpenActivity(activeSession.activity, activeSession.room.code)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 min-h-[38px] whitespace-nowrap"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Board Stage
                </button>
                <button
                  type="button"
                  aria-label="End live session"
                  onClick={() => handleEndSession(activeSession.room.code)}
                  className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 4-Column Aggregated KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">Students Joined</p>
                <p className="mt-1 font-mono text-2xl font-bold text-slate-950 tabular-nums">
                  {aggregated.totalStudents}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Active in room {activeSession.room.code}
                </p>
              </div>

              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">Completion Status</p>
                <p className="mt-1 font-mono text-2xl font-bold text-slate-950 tabular-nums">
                  {aggregated.completedCount}/{aggregated.totalStudents}{' '}
                  <span className="text-base font-semibold text-emerald-700">
                    ({aggregated.completionRate}%)
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Students finished activity
                </p>
              </div>

              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">Class Average Score</p>
                <p className="mt-1 font-mono text-2xl font-bold text-slate-950 tabular-nums">
                  {aggregated.avgAccuracy}%
                </p>
                <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                  Mean points: {aggregated.avgPoints}
                </p>
              </div>

              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">
                  {activeSession.room.playMode === 'group' ? 'Leading Team' : 'Top Score'}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-slate-950 truncate">
                  {activeSession.room.playMode === 'group'
                    ? aggregated.teams[0]?.team || '—'
                    : aggregated.topStudent?.name || '—'}
                </p>
                <p className="mt-0.5 text-xs font-mono text-slate-500 tabular-nums">
                  {activeSession.room.playMode === 'group'
                    ? aggregated.teams[0]
                      ? `${aggregated.teams[0].totalScore} pts (${aggregated.teams[0].members} students)`
                      : 'Waiting for scores'
                    : aggregated.topStudent
                    ? `${aggregated.topStudent.score} pts (${getPercentage(aggregated.topStudent)}%)`
                    : 'Waiting for scores'}
                </p>
              </div>
            </div>

            {/* Group Breakdown Strip */}
            {aggregated.teams.length > 0 && (
              <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                <span className="font-semibold text-slate-600 uppercase tracking-wide">
                  Team Aggregates:
                </span>
                {aggregated.teams.map((t) => (
                  <div key={t.team} className="flex items-center gap-2 text-slate-700 tabular-nums">
                    <span className="font-semibold text-slate-950">{t.team}</span>
                    <span className="font-mono text-blue-800 font-semibold">{t.totalScore} pts</span>
                    <span className="text-slate-500">
                      ({t.completed}/{t.members} done)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Student Progress Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {/* Table Filter Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter student or progress…"
                    className="rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none min-h-[38px] w-56"
                  />
                </div>

                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {(
                    [
                      ['all', `All (${participants.length})`],
                      ['completed', `Completed (${aggregated.completedCount})`],
                      [
                        'in_progress',
                        `In Progress (${participants.length - aggregated.completedCount})`,
                      ],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatusFilter(key)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                        statusFilter === key
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {availableTeams.length > 0 && (
                  <select
                    aria-label="Filter by team"
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 min-h-[38px]"
                  >
                    <option value="ALL">All Teams</option>
                    {availableTeams.map((t) => (
                      <option key={t} value={t}>
                        Team {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenStudentJoin(activeSession.room.code)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[38px] whitespace-nowrap"
                >
                  Open Student Join View
                </button>
                <button
                  type="button"
                  disabled={participants.length === 0}
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[38px] whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download CSV
                </button>
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <p className="font-display text-lg font-semibold text-slate-900">
                  Waiting for students to join Room{' '}
                  <span className="font-mono text-blue-700">{activeSession.room.code}</span>
                </p>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Share code <strong className="font-mono">{activeSession.room.code}</strong> or copy the join link. Student rows will appear here automatically as they join and answer.
                </p>
                <div className="pt-1 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(activeSession.room.code)}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 min-h-[40px]"
                  >
                    {copiedLink ? 'Link Copied' : 'Copy Student Join Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenStudentJoin(activeSession.room.code)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[40px]"
                  >
                    Try Joining as a Student
                  </button>
                </div>
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No students match the current search or status filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSort('name')}
                          className="inline-flex items-center gap-1 hover:text-slate-950"
                        >
                          Student
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSort('team')}
                          className="inline-flex items-center gap-1 hover:text-slate-950"
                        >
                          Team
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSort('completed')}
                          className="inline-flex items-center gap-1 hover:text-slate-950"
                        >
                          Status
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4">Current Progress</th>
                      <th className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleSort('score')}
                          className="inline-flex items-center justify-end gap-1 hover:text-slate-950"
                        >
                          Score
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 text-right">Accuracy</th>
                      <th className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleSort('updatedAt')}
                          className="inline-flex items-center justify-end gap-1 hover:text-slate-950"
                        >
                          Last Active
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {filteredParticipants.map((p) => {
                      const pct = getPercentage(p);
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/90 transition-colors h-[46px]"
                        >
                          <td className="py-2.5 px-4 font-semibold text-slate-950 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <StudentCharacterIcon character={p.character} size="sm" />
                              <span>{p.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                            {p.team}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            {p.completed ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                                <Clock className="h-4 w-4 shrink-0" />
                                In Progress
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                            {p.summary}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-950 tabular-nums whitespace-nowrap">
                            {p.total > 0 ? `${p.score} / ${p.total}` : `${p.score}`}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                            {p.total > 0 ? `${pct}%` : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                            {formatTime(p.updatedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

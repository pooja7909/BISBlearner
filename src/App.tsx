import { useEffect, useState } from 'react';
import { BookOpen, Check, Layers, Pencil, Play, RotateCcw, X } from 'lucide-react';
import type { ClassroomActivity } from './types.ts';
import { DEFAULT_SUBJECTS, FORMAT_META } from './types.ts';
import { ActivityGeneratorForm } from './components/ActivityGeneratorForm.tsx';
import { SchoolLibraryView } from './components/SchoolLibraryView.tsx';
import { ActivityStageWorkspace } from './components/ActivityStageWorkspace.tsx';
import { LiveJoinView } from './components/LiveJoinView.tsx';
import { LiveTeacherDashboard } from './components/LiveTeacherDashboard.tsx';
import { TeacherPreviewStage } from './components/TeacherPreviewStage.tsx';
import heroClassroomImg from './assets/images/hero_inclusive_classroom_1794511562800.jpg';

type AppView = 'studio' | 'library' | 'dashboard' | 'join' | 'guide' | 'preview' | 'play';

const DEFAULT_HERO_HEADER = 'Reception to Sixth Form · Every Subject · Individual or Group Play';

export default function App() {
  const [view, setView] = useState<AppView>('studio');
  const [activities, setActivities] = useState<ClassroomActivity[]>([]);
  const [subjects, setSubjects] = useState<string[]>([...DEFAULT_SUBJECTS]);
  const [heroHeader, setHeroHeader] = useState<string>(DEFAULT_HERO_HEADER);
  const [editingHeroHeader, setEditingHeroHeader] = useState(false);
  const [heroHeaderDraft, setHeroHeaderDraft] = useState<string>(DEFAULT_HERO_HEADER);
  const [savingHeroHeader, setSavingHeroHeader] = useState(false);
  const [heroHeaderError, setHeroHeaderError] = useState<string | null>(null);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const [activeActivity, setActiveActivity] = useState<ClassroomActivity | null>(null);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [recentPack, setRecentPack] = useState<ClassroomActivity[]>([]);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const [initialRoomCode, setInitialRoomCode] = useState<string>('');
  const [studentSession, setStudentSession] = useState<{
    code: string;
    participantId: string;
    name: string;
    team: string;
    character?: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomCode(roomParam.toUpperCase());
      setView('join');
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [actRes, subjRes, settingsRes] = await Promise.all([
          fetch('/api/activities'),
          fetch('/api/subjects'),
          fetch('/api/settings'),
        ]);
        const actData = await actRes.json();
        if (!actRes.ok) throw new Error(actData.error || 'Could not load library');
        setActivities(Array.isArray(actData.activities) ? actData.activities : []);

        if (subjRes.ok) {
          const subjData = await subjRes.json();
          if (Array.isArray(subjData.subjects) && subjData.subjects.length > 0) {
            setSubjects(subjData.subjects);
          }
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (typeof settingsData.heroHeader === 'string' && settingsData.heroHeader.trim()) {
            setHeroHeader(settingsData.heroHeader.trim());
            setHeroHeaderDraft(settingsData.heroHeader.trim());
          }
        }
      } catch (err) {
        setLibraryError(err instanceof Error ? err.message : 'Unable to load activities');
      } finally {
        setLoadingLibrary(false);
      }
    }
    load();
  }, []);

  async function saveHeroHeaderText(nextText: string) {
    const trimmed = nextText.trim();
    if (!trimmed) {
      setHeroHeaderError('Please enter header text or reset to default.');
      return;
    }
    setSavingHeroHeader(true);
    setHeroHeaderError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroHeader: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save header text.');
      const saved = typeof data.heroHeader === 'string' ? data.heroHeader : trimmed;
      setHeroHeader(saved);
      setHeroHeaderDraft(saved);
      setEditingHeroHeader(false);
    } catch (err) {
      setHeroHeaderError(err instanceof Error ? err.message : 'Could not save header text.');
    } finally {
      setSavingHeroHeader(false);
    }
  }

  function handleGenerated(createdList: ClassroomActivity[], primary: ClassroomActivity) {
    setActivities((prev) => [...createdList, ...prev]);
    if (primary.subject && !subjects.some((s) => s.toLowerCase() === primary.subject.toLowerCase())) {
      setSubjects((prev) => [...prev, primary.subject]);
    }
    setRecentPack(createdList.length > 1 ? createdList : []);
    setActiveActivity(primary);
    setStudentSession(null);
    setView('preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleActivityUpdated(updated: ClassroomActivity) {
    setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setActiveActivity(updated);
    setRecentPack((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  function handleAdapted(adapted: ClassroomActivity) {
    setActivities((prev) => [adapted, ...prev]);
    setActiveActivity(adapted);
    setRecentPack((prev) => (prev.length > 0 ? [...prev, adapted] : []));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDeleteActivity(id: string) {
    try {
      const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setActivities((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // Ignore transient delete error
    }
  }

  function handlePlayActivity(activity: ClassroomActivity, roomCode?: string) {
    setRecentPack([]);
    setActiveActivity(activity);
    setActiveRoomCode(roomCode ?? null);
    setStudentSession(null);
    setView(roomCode ? 'play' : 'preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollToGenerator() {
    setView('studio');
    setTimeout(() => {
      document.getElementById('activity-builder')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => {
              setStudentSession(null);
              setView('studio');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0 text-left"
          >
            Chalkboard Studio
          </button>

          {/* Zone 2: 4 concise single-line navigation links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => {
                setStudentSession(null);
                setView('studio');
              }}
              className={`hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                view === 'studio' ? 'text-slate-950 font-semibold underline' : ''
              }`}
            >
              Studio
            </button>
            <button
              type="button"
              onClick={() => {
                setStudentSession(null);
                setView('library');
              }}
              className={`hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                view === 'library' ? 'text-slate-950 font-semibold underline' : ''
              }`}
            >
              School Library
            </button>
            <button
              type="button"
              onClick={() => {
                setStudentSession(null);
                setView('dashboard');
              }}
              className={`hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                view === 'dashboard' ? 'text-slate-950 font-semibold underline' : ''
              }`}
            >
              Live Dashboard
            </button>
            <button
              type="button"
              onClick={() => setView('join')}
              className={`hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                view === 'join' ? 'text-slate-950 font-semibold underline' : ''
              }`}
            >
              Live Join
            </button>
            <button
              type="button"
              onClick={() => {
                setStudentSession(null);
                setView('guide');
              }}
              className={`hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                view === 'guide' ? 'text-slate-950 font-semibold underline' : ''
              }`}
            >
              How It Works
            </button>
          </nav>

          {/* Zone 3: 1 primary CTA button */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={scrollToGenerator}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors min-h-[40px] whitespace-nowrap shrink-0"
            >
              New Activity
            </button>
          </div>
        </div>

        {/* Mobile compact nav row */}
        <div className="flex md:hidden items-center justify-around border-t border-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setView('studio')}
            className={`px-2 py-1 whitespace-nowrap ${view === 'studio' ? 'text-blue-700 font-semibold' : ''}`}
          >
            Studio
          </button>
          <button
            type="button"
            onClick={() => setView('library')}
            className={`px-2 py-1 whitespace-nowrap ${view === 'library' ? 'text-blue-700 font-semibold' : ''}`}
          >
            Library
          </button>
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className={`px-2 py-1 whitespace-nowrap ${view === 'dashboard' ? 'text-blue-700 font-semibold' : ''}`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setView('join')}
            className={`px-2 py-1 whitespace-nowrap ${view === 'join' ? 'text-blue-700 font-semibold' : ''}`}
          >
            Live Join
          </button>
          <button
            type="button"
            onClick={() => setView('guide')}
            className={`px-2 py-1 whitespace-nowrap ${view === 'guide' ? 'text-blue-700 font-semibold' : ''}`}
          >
            Guide
          </button>
        </div>
      </header>

      <main className="flex-1">
        {view === 'preview' && activeActivity && (
          <TeacherPreviewStage
            activity={activeActivity}
            packActivities={recentPack}
            onSelectPackActivity={(act) => setActiveActivity(act)}
            onBack={() => setView('library')}
            onUpdated={handleActivityUpdated}
            onLaunch={(readyActivity) => {
              handleActivityUpdated(readyActivity);
              setView('play');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {view === 'play' && activeActivity && (
          <div>
            {recentPack.length > 1 && !studentSession && (
              <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-2">
                      <Layers className="h-3.5 w-3.5 text-blue-700" />
                      Lesson Pack Sequence:
                    </span>
                    {recentPack.map((act, idx) => {
                      const stageLabel =
                        idx === 0 ? '1. Starter' : idx === 1 ? '2. Main' : '3. Plenary';
                      const isCurrent = act.id === activeActivity.id;
                      return (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => setActiveActivity(act)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                            isCurrent
                              ? 'bg-blue-700 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {stageLabel}: {FORMAT_META[act.format].shortLabel}
                        </button>
                      );
                    })}
                  </div>
                  {(() => {
                    const idx = recentPack.findIndex((a) => a.id === activeActivity.id);
                    const nextAct = idx >= 0 && idx + 1 < recentPack.length ? recentPack[idx + 1] : null;
                    if (!nextAct) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => setActiveActivity(nextAct)}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
                      >
                        Skip to Next Part →
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}

            <ActivityStageWorkspace
              activity={activeActivity}
              onBack={() => {
                setStudentSession(null);
                setActiveRoomCode(null);
                setView('library');
              }}
              onOpenPreview={() => {
                setView('preview');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onActivityCreated={handleAdapted}
              initialRoomCode={activeRoomCode}
              onOpenDashboard={(code) => {
                setActiveRoomCode(code);
                setView('dashboard');
              }}
              studentSession={studentSession}
            />
          </div>
        )}

        {view === 'studio' && (
          <div className="mx-auto max-w-[1380px] px-4 sm:px-6 py-8 sm:py-10 space-y-12">
            {/* Hero Split Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-7 flex flex-col justify-center space-y-5 py-2">
                {!editingHeroHeader ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      onClick={() => {
                        setHeroHeaderDraft(heroHeader);
                        setHeroHeaderError(null);
                        setEditingHeroHeader(true);
                      }}
                      title="Click to edit header text"
                      className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-blue-700 hover:text-blue-800 transition-colors"
                    >
                      {heroHeader}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setHeroHeaderDraft(heroHeader);
                        setHeroHeaderError(null);
                        setEditingHeroHeader(true);
                      }}
                      aria-label="Edit header text"
                      title="Edit header text"
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 transition-colors whitespace-nowrap"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveHeroHeaderText(heroHeaderDraft);
                    }}
                    className="space-y-2 rounded-xl border border-blue-200 bg-white p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={heroHeaderDraft}
                        onChange={(e) => setHeroHeaderDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingHeroHeader(false);
                            setHeroHeaderError(null);
                          }
                        }}
                        maxLength={120}
                        autoFocus
                        aria-label="Studio header tagline"
                        placeholder="e.g. Oakwood Academy · Year 7 to Year 11 · Humanities"
                        className="min-w-[240px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="submit"
                        disabled={savingHeroHeader}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 transition-colors min-h-[34px] whitespace-nowrap"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {savingHeroHeader ? 'Saving…' : 'Save'}
                      </button>
                      {heroHeader !== DEFAULT_HERO_HEADER && (
                        <button
                          type="button"
                          disabled={savingHeroHeader}
                          onClick={() => saveHeroHeaderText(DEFAULT_HERO_HEADER)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors min-h-[34px] whitespace-nowrap"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reset
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={savingHeroHeader}
                        onClick={() => {
                          setEditingHeroHeader(false);
                          setHeroHeaderError(null);
                        }}
                        aria-label="Cancel editing header"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors min-h-[34px] whitespace-nowrap"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </div>
                    {heroHeaderError && (
                      <p className="text-xs text-red-700">{heroHeaderError}</p>
                    )}
                  </form>
                )}
                <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-950 text-balance max-w-2xl leading-[1.12]">
                  Turn any topic, slide deck, or PDF into interactive class play.
                </h1>
                <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                  Enter your topic and lesson objectives—or upload a presentation, PDF, or worksheet photo. Launch Bingo, Draw & Label, Live Word Clouds, Team Duel Grids, Codebreaker Escapes, Sorting, and Quizzes with background music and full teacher controls.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={scrollToGenerator}
                    className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-colors min-h-[46px] whitespace-nowrap"
                  >
                    Build an Activity
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('library')}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors min-h-[46px] whitespace-nowrap"
                  >
                    Browse School Library
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="h-full min-h-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {!heroImgFailed ? (
                    <img
                      src={heroClassroomImg}
                      alt="Diverse school students collaborating around an interactive classroom learning table"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-[260px] flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-8 text-center">
                      <BookOpen className="h-10 w-10 text-blue-700 mb-3" />
                      <p className="font-display text-lg font-semibold text-slate-900">
                        Whole-School Interactive Classroom
                      </p>
                      <p className="mt-1 text-sm text-slate-600 max-w-xs">
                        Inclusive activities built for boards, pairs, and student devices.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Activity Builder Form */}
            <section id="activity-builder">
              <ActivityGeneratorForm
                subjects={subjects}
                onSubjectAdded={(nextSubjects) => setSubjects(nextSubjects)}
                onGenerated={handleGenerated}
              />
            </section>

            {/* Ready-to-Try Whole-School Samples */}
            <section className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-slate-950">
                    Try a Ready-Made Classroom Activity
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Explore curriculum-ready games across Key Stages 1 to 4—including Bingo, Drawing, Word Clouds, Team Duels, and Codebreakers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setView('library')}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
                >
                  View all {activities.length} activities →
                </button>
              </div>

              {loadingLibrary ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-44 rounded-2xl border border-slate-200 bg-white p-5 animate-pulse"
                    />
                  ))}
                </div>
              ) : libraryError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  {libraryError}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {activities.slice(0, 9).map((act) => (
                    <article
                      key={act.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
                          <span className="font-semibold text-slate-800">{act.yearGroup}</span>
                          <span aria-hidden="true">·</span>
                          <span>{act.subject}</span>
                          <span aria-hidden="true">·</span>
                          <span>{FORMAT_META[act.format].shortLabel}</span>
                        </div>
                        <h3 className="font-display text-lg font-semibold text-slate-950 leading-snug">
                          {act.title}
                        </h3>
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {act.objectives[0]}
                        </p>
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                        <span className="text-xs text-slate-500 tabular-nums">
                          {act.estimatedMinutes} mins
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePlayActivity(act)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors min-h-[38px] whitespace-nowrap"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Preview & Launch
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {view === 'library' && (
          <div className="mx-auto max-w-[1380px] px-4 sm:px-6 py-8 sm:py-10">
            {loadingLibrary ? (
              <p className="text-sm text-slate-500">Loading school library…</p>
            ) : (
              <SchoolLibraryView
                activities={activities}
                subjects={subjects}
                onPlay={handlePlayActivity}
                onDelete={handleDeleteActivity}
              />
            )}
          </div>
        )}

        {view === 'dashboard' && (
          <LiveTeacherDashboard
            activities={activities}
            initialRoomCode={activeRoomCode}
            onOpenActivity={(act, roomCode) => handlePlayActivity(act, roomCode)}
            onOpenStudentJoin={(code) => {
              if (code) setInitialRoomCode(code);
              setView('join');
            }}
          />
        )}

        {view === 'join' && (
          <LiveJoinView
            initialCode={initialRoomCode}
            onJoined={({ activity, session }) => {
              setActiveActivity(activity);
              setStudentSession(session);
              setRecentPack([]);
              setView('play');
            }}
          />
        )}

        {view === 'guide' && (
          <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-10">
            <div className="space-y-3 border-b border-slate-200 pb-6">
              <h1 className="font-display text-3xl font-bold text-slate-950">
                Designed for Every Classroom Across the Whole School
              </h1>
              <p className="text-base text-slate-600 leading-relaxed">
                Whether you teach Reception phonics, Year 5 Geography, or GCSE Macbeth, Chalkboard Studio turns your lesson objectives into interactive learning in three steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2">
                <span className="font-mono text-xs font-semibold text-blue-700">01</span>
                <h2 className="font-display text-lg font-semibold text-slate-950">
                  Describe Your Lesson
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Type the topic, choose the year group, and paste your lesson objectives. Pick one interactive format or generate a full 3-part lesson pack.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2">
                <span className="font-mono text-xs font-semibold text-blue-700">02</span>
                <h2 className="font-display text-lg font-semibold text-slate-950">
                  Play Together or Live
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Project Board Mode for whole-class table teams, or launch a 4-letter Room Code so students join on tablets and laptops while you watch live progress.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2">
                <span className="font-mono text-xs font-semibold text-blue-700">03</span>
                <h2 className="font-display text-lg font-semibold text-slate-950">
                  Include Every Learner
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Use built-in Read Aloud, Extra-Large Print, Calm Cream Paper, and one-click Visual/EAL or Stretch adaptations so every child succeeds.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-950">
                  Ready to try it with your next class?
                </h3>
                <p className="text-sm text-slate-600">
                  Open the Studio to build a custom activity or explore the starter library.
                </p>
              </div>
              <button
                type="button"
                onClick={scrollToGenerator}
                className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors min-h-[44px] whitespace-nowrap shrink-0"
              >
                Open Studio
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-5 text-xs text-slate-500">
          <span>Chalkboard Studio · Whole-School Interactive Lesson Activities</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setView('library')}
              className="hover:text-slate-900"
            >
              School Library
            </button>
            <button
              type="button"
              onClick={() => setView('join')}
              className="hover:text-slate-900"
            >
              Student Live Join
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

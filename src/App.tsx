import { useEffect, useState } from 'react';
import { Check, ExternalLink, Layers, Pencil, Play, RotateCcw, X } from 'lucide-react';
import type { ClassroomActivity } from './types.ts';
import { DEFAULT_SUBJECTS, FORMAT_META, yearLabel } from './types.ts';
import { ActivityGeneratorForm } from './components/ActivityGeneratorForm.tsx';
import { SchoolLibraryView } from './components/SchoolLibraryView.tsx';
import { ActivityStageWorkspace } from './components/ActivityStageWorkspace.tsx';
import { LiveJoinView } from './components/LiveJoinView.tsx';
import { LiveTeacherDashboard } from './components/LiveTeacherDashboard.tsx';
import { TeacherPreviewStage } from './components/TeacherPreviewStage.tsx';
import { pupilJoinAddress } from './utils/joinLink.ts';

type AppView = 'studio' | 'library' | 'dashboard' | 'join' | 'guide' | 'preview' | 'play';

const DEFAULT_HERO_HEADER = 'Reception to Sixth Form · Every Subject · Individual or Group Play';
const PACK_STAGE = ['1. Start', '2. Main', '3. Finish'];

/** Pupils arrive on /join (or a QR link with ?room=CODE) and only ever see the join + game screens. */
function isPupilEntry(): boolean {
  const params = new URLSearchParams(window.location.search);
  return window.location.pathname.replace(/\/+$/, '') === '/join' || params.has('room');
}

export default function App() {
  const [pupilMode] = useState<boolean>(isPupilEntry);
  const [view, setView] = useState<AppView>(pupilMode ? 'join' : 'studio');
  const [activities, setActivities] = useState<ClassroomActivity[]>([]);
  const [subjects, setSubjects] = useState<string[]>([...DEFAULT_SUBJECTS]);
  const [heroHeader, setHeroHeader] = useState<string>(DEFAULT_HERO_HEADER);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingHeroHeader, setEditingHeroHeader] = useState(false);
  const [heroHeaderDraft, setHeroHeaderDraft] = useState<string>(DEFAULT_HERO_HEADER);
  const [savingHeroHeader, setSavingHeroHeader] = useState(false);
  const [heroHeaderError, setHeroHeaderError] = useState<string | null>(null);
  const [loadingLibrary, setLoadingLibrary] = useState(!pupilMode);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const [activeActivity, setActiveActivity] = useState<ClassroomActivity | null>(null);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [recentPack, setRecentPack] = useState<ClassroomActivity[]>([]);

  const [initialRoomCode] = useState<string>(() =>
    (new URLSearchParams(window.location.search).get('room') || '').toUpperCase()
  );
  const [studentSession, setStudentSession] = useState<{
    code: string;
    participantId: string;
    name: string;
    team: string;
    character?: string;
  } | null>(null);

  useEffect(() => {
    if (pupilMode) return;
    async function load() {
      try {
        const [actRes, subjRes, settingsRes] = await Promise.all([
          fetch('/api/activities'),
          fetch('/api/subjects'),
          fetch('/api/settings'),
        ]);
        const actData = await actRes.json();
        if (!actRes.ok) throw new Error(actData.error || 'Could not load the library.');
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
          setIsAdmin(Boolean(settingsData.isAdmin));
        }
      } catch {
        setLibraryError('The school library could not be loaded. Check the internet connection and reload the page.');
      } finally {
        setLoadingLibrary(false);
      }
    }
    load();
  }, [pupilMode]);

  async function saveHeroHeaderText(nextText: string) {
    const trimmed = nextText.trim();
    if (!trimmed) {
      setHeroHeaderError('Please enter some text or reset to the default.');
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
      if (!res.ok) throw new Error(data.error || 'Could not save the text.');
      const saved = typeof data.heroHeader === 'string' ? data.heroHeader : trimmed;
      setHeroHeader(saved);
      setHeroHeaderDraft(saved);
      setEditingHeroHeader(false);
    } catch (err) {
      setHeroHeaderError(err instanceof Error ? err.message : 'Could not save the text.');
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

  /** replacesId is set when the server saved a personal copy of someone else's lesson. */
  function handleActivityUpdated(updated: ClassroomActivity, replacesId?: string) {
    const oldId = replacesId ?? updated.id;
    setActivities((prev) =>
      replacesId ? [updated, ...prev] : prev.map((a) => (a.id === oldId ? updated : a))
    );
    setActiveActivity(updated);
    setRecentPack((prev) => prev.map((a) => (a.id === oldId ? updated : a)));
  }

  function handleAdapted(adapted: ClassroomActivity) {
    setActivities((prev) => [adapted, ...prev]);
    setActiveActivity(adapted);
    setRecentPack((prev) => (prev.length > 0 ? [...prev, adapted] : []));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDeleteActivity(id: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error || 'That lesson could not be deleted.';
      setActivities((prev) => prev.filter((a) => a.id !== id));
      return null;
    } catch {
      return 'No internet connection. Please try again.';
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

  function goTo(next: AppView) {
    setStudentSession(null);
    setView(next);
    window.scrollTo({ top: 0 });
  }

  /* ------------------------------ Pupil-only app ------------------------------ */
  if (pupilMode) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-4 px-4 sm:px-6 py-3.5">
            <span className="font-display text-lg font-bold tracking-tight text-slate-950">Chalkboard Studio</span>
            <span className="text-sm font-medium text-slate-500">Join a class game</span>
          </div>
        </header>
        <main className="flex-1">
          {view === 'play' && activeActivity && studentSession ? (
            <ActivityStageWorkspace
              activity={activeActivity}
              onBack={() => {
                setStudentSession(null);
                setView('join');
              }}
              onActivityCreated={() => undefined}
              studentSession={studentSession}
            />
          ) : (
            <LiveJoinView
              initialCode={initialRoomCode}
              onJoined={({ activity, session }) => {
                setActiveActivity(activity);
                setStudentSession(session);
                setView('play');
              }}
            />
          )}
        </main>
      </div>
    );
  }

  /* ------------------------------ Teacher app ------------------------------ */
  const navItems: { id: AppView; label: string; active: boolean }[] = [
    { id: 'studio', label: 'Make a lesson', active: view === 'studio' },
    { id: 'library', label: 'School library', active: view === 'library' || view === 'preview' || view === 'play' || view === 'dashboard' },
    { id: 'guide', label: 'Help', active: view === 'guide' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 sm:px-6 py-3">
          <button
            type="button"
            onClick={() => goTo('studio')}
            className="font-display text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0 text-left"
          >
            Chalkboard Studio
          </button>

          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2 order-3 sm:order-none w-full sm:w-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={item.active ? 'page' : undefined}
                onClick={() => goTo(item.id)}
                className={`flex-1 sm:flex-none rounded-xl px-4 py-2.5 text-base font-semibold transition-colors whitespace-nowrap ${
                  item.active ? 'bg-blue-700 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <a
            href="/join"
            target="_blank"
            rel="noreferrer"
            title="Open the pupil join page in a new tab"
            className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Pupils join at <strong className="font-semibold text-slate-900">{pupilJoinAddress()}</strong>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main className="flex-1">
        {view === 'preview' && activeActivity && (
          <TeacherPreviewStage
            activity={activeActivity}
            packActivities={recentPack}
            onSelectPackActivity={(act) => setActiveActivity(act)}
            onBack={() => goTo('library')}
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
            {recentPack.length > 1 && (
              <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 mr-1">
                      <Layers className="h-4 w-4 text-blue-700" />
                      This lesson:
                    </span>
                    {recentPack.map((act, idx) => {
                      const isCurrent = act.id === activeActivity.id;
                      return (
                        <button
                          key={act.id}
                          type="button"
                          aria-current={isCurrent ? 'step' : undefined}
                          onClick={() => setActiveActivity(act)}
                          className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                            isCurrent ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {PACK_STAGE[idx] ?? `${idx + 1}.`} {FORMAT_META[act.format].shortLabel}
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
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap"
                      >
                        Next game →
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}

            <ActivityStageWorkspace
              activity={activeActivity}
              onBack={() => {
                setActiveRoomCode(null);
                goTo('library');
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
              studentSession={null}
            />
          </div>
        )}

        {view === 'studio' && (
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 py-8 sm:py-10 space-y-12">
            <section className="space-y-3">
              {!editingHeroHeader ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{heroHeader}</p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeroHeaderDraft(heroHeader);
                        setHeroHeaderError(null);
                        setEditingHeroHeader(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-200/70 hover:text-slate-900"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit (admin)
                    </button>
                  )}
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
                      maxLength={120}
                      autoFocus
                      aria-label="Home page tagline"
                      className="min-w-[240px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    />
                    <button type="submit" disabled={savingHeroHeader} className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white">
                      <Check className="h-3.5 w-3.5" />
                      {savingHeroHeader ? 'Saving…' : 'Save'}
                    </button>
                    {heroHeader !== DEFAULT_HERO_HEADER && (
                      <button type="button" disabled={savingHeroHeader} onClick={() => saveHeroHeaderText(DEFAULT_HERO_HEADER)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm">
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </button>
                    )}
                    <button type="button" onClick={() => setEditingHeroHeader(false)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                  {heroHeaderError && <p className="text-sm text-red-700">{heroHeaderError}</p>}
                </form>
              )}
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 text-balance">
                Turn your lesson into a class game
              </h1>
            </section>

            <section id="activity-builder">
              <ActivityGeneratorForm
                subjects={subjects}
                onSubjectAdded={(nextSubjects) => setSubjects(nextSubjects)}
                onGenerated={handleGenerated}
              />
            </section>

            <section className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-slate-950">Or use a ready-made lesson</h2>
                  <p className="mt-1 text-base text-slate-600">Made by teachers in our school. Open one to check it, then play.</p>
                </div>
                <button
                  type="button"
                  onClick={() => goTo('library')}
                  className="text-base font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
                >
                  See all {activities.length} lessons →
                </button>
              </div>

              {loadingLibrary ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-44 rounded-2xl border border-slate-200 bg-white p-5 animate-pulse" />
                  ))}
                </div>
              ) : libraryError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-base text-red-900">{libraryError}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {activities.slice(0, 6).map((act) => (
                    <article key={act.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition-colors">
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
                          <span className="font-semibold text-slate-800">{yearLabel(act)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{act.subject}</span>
                          <span aria-hidden="true">·</span>
                          <span>{FORMAT_META[act.format].shortLabel}</span>
                        </div>
                        <h3 className="font-display text-lg font-semibold text-slate-950 leading-snug">{act.title}</h3>
                        <p className="text-sm text-slate-600 line-clamp-2">{act.objectives[0]}</p>
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                        <span className="text-sm text-slate-500 tabular-nums">{act.estimatedMinutes} mins</span>
                        <button
                          type="button"
                          onClick={() => handlePlayActivity(act)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors min-h-[42px] whitespace-nowrap"
                        >
                          <Play className="h-4 w-4" />
                          Open
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
              <p className="text-base text-slate-500">Loading the school library…</p>
            ) : libraryError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-base text-red-900">{libraryError}</p>
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
              window.open(code ? `/join?room=${encodeURIComponent(code)}` : '/join', '_blank', 'noopener');
            }}
          />
        )}

        {view === 'guide' && (
          <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-8">
            <div className="space-y-3 border-b border-slate-200 pb-6">
              <h1 className="font-display text-3xl font-bold text-slate-950">How to use Chalkboard Studio</h1>
              <p className="text-lg text-slate-600 leading-relaxed">Three steps. You can't break anything: pupils see nothing until you press Play.</p>
            </div>

            <ol className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                ['Make', 'Press "Make a lesson". Type what you are teaching, choose the year group, and press the blue button. Or open a ready-made lesson from the School library.'],
                ['Check', 'Read the questions. Change, add or remove any you like. Changes are saved for you.'],
                ['Play', 'Press "Play with the class", then "Show on board" to fill the screen. Want pupils on tablets? Press "Let pupils join on devices" and they scan the QR code.'],
              ].map(([title, body], i) => (
                <li key={title} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-base font-bold text-white">{i + 1}</span>
                  <h2 className="font-display text-xl font-semibold text-slate-950">{title}</h2>
                  <p className="text-base text-slate-700 leading-relaxed">{body}</p>
                </li>
              ))}
            </ol>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
              <h2 className="font-display text-xl font-semibold text-slate-950">Common questions</h2>
              <dl className="space-y-4 text-base">
                <div>
                  <dt className="font-semibold text-slate-900">The internet or projector stopped working</dt>
                  <dd className="text-slate-700">Press "Print worksheet" on any game. You get a pupil sheet and a separate answer sheet.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900">Pupils can't find the game</dt>
                  <dd className="text-slate-700">They go to <strong>{pupilJoinAddress()}</strong> and type the 4-letter code on the board, or scan the QR code.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900">I changed another teacher's lesson</dt>
                  <dd className="text-slate-700">Don't worry. Your changes are saved as your own copy; their lesson stays the same.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900">The read-aloud voice sounds wrong</dt>
                  <dd className="text-slate-700">It uses the voices installed on this computer. Language lessons are read in that language; everything else in English.</dd>
                </div>
              </dl>
            </div>

            <button
              type="button"
              onClick={() => goTo('studio')}
              className="rounded-xl bg-blue-700 px-6 py-3 text-base font-semibold text-white hover:bg-blue-800 min-h-[48px]"
            >
              Make a lesson now
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-5 text-sm text-slate-500">
          <span>Chalkboard Studio</span>
          <span>
            Pupils join at <strong className="text-slate-700">{pupilJoinAddress()}</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}

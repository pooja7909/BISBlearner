import { useMemo, useState } from 'react';
import { Play, Search, Trash2 } from 'lucide-react';
import {
  ACTIVITY_FORMATS,
  DEFAULT_SUBJECTS,
  EXACT_YEARS,
  FORMAT_META,
  TIER_LABELS,
  bandForYear,
  yearLabel,
  type ActivityFormat,
  type ClassroomActivity,
  type SubjectArea,
} from '../types.ts';

interface SchoolLibraryViewProps {
  activities: ClassroomActivity[];
  subjects?: string[];
  onPlay: (activity: ClassroomActivity) => void;
  /** Resolves to an error message, or null when deleted. */
  onDelete: (id: string) => Promise<string | null>;
}

export function SchoolLibraryView({
  activities,
  subjects = [...DEFAULT_SUBJECTS],
  onPlay,
  onDelete,
}: SchoolLibraryViewProps) {
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [onlyMine, setOnlyMine] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function confirmDelete(id: string) {
    setDeletingId(id);
    const error = await onDelete(id);
    setDeletingId(null);
    setConfirmingId(null);
    setDeleteError(error ? { id, message: error } : null);
  }
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | SubjectArea>('ALL');
  const [formatFilter, setFormatFilter] = useState<'ALL' | ActivityFormat>('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((act) => {
      if (onlyMine && !act.mine) return false;
      if (yearFilter !== 'ALL') {
        // Lessons made for an exact year match that year; older lessons match by band.
        if (act.exactYear ? act.exactYear !== yearFilter : act.yearGroup !== bandForYear(yearFilter)) return false;
      }
      if (subjectFilter !== 'ALL' && act.subject !== subjectFilter) return false;
      if (formatFilter !== 'ALL' && act.format !== formatFilter) return false;
      if (q) {
        const hay = `${act.title} ${act.topic} ${act.subject} ${act.objectives.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activities, search, yearFilter, subjectFilter, formatFilter, onlyMine]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-950">
            School library
          </h2>
          <p className="mt-1 text-base text-slate-600">
            Lessons made by teachers in our school. Open one to check the questions, then play it.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 cursor-pointer">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="h-4 w-4" />
            Only my lessons
          </label>
          <p className="text-sm text-slate-500 tabular-nums">
            {filtered.length} of {activities.length}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-5 relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search, e.g. fractions or Romans"
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none min-h-[44px]"
          />
        </div>

        <div className="lg:col-span-3">
          <select
            aria-label="Filter by Year Group"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none min-h-[44px]"
          >
            <option value="ALL">All year groups</option>
            {EXACT_YEARS.map((y) => (
              <option key={y.label} value={y.label}>
                {y.label}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            aria-label="Filter by Subject"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value as 'ALL' | SubjectArea)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none min-h-[44px]"
          >
            <option value="ALL">All subjects</option>
            {Array.from(new Set([...subjects, ...activities.map((a) => a.subject)])).map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            aria-label="Filter by Format"
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value as 'ALL' | ActivityFormat)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none min-h-[44px]"
          >
            <option value="ALL">All games</option>
            {ACTIVITY_FORMATS.map((fmt) => (
              <option key={fmt} value={fmt}>
                {FORMAT_META[fmt].shortLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-display text-lg font-semibold text-slate-900">
            No lessons found
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Try a shorter search, set the filters back to "All", or make a new lesson.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((activity) => (
            <article
              key={activity.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className="font-semibold text-slate-800">{yearLabel(activity)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activity.subject}</span>
                  <span aria-hidden="true">·</span>
                  <span>{FORMAT_META[activity.format].shortLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{activity.estimatedMinutes}m</span>
                </div>

                <h3 className="font-display text-lg font-semibold text-slate-950 leading-snug">
                  {activity.title}
                </h3>

                <p className="text-sm text-slate-600 line-clamp-2">
                  {activity.objectives[0] || activity.topic}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-500 truncate">
                  {activity.mine ? 'Made by you' : TIER_LABELS[activity.differentiation]?.label ?? ''}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {activity.mine && confirmingId !== activity.id && (
                    <button
                      type="button"
                      aria-label={`Delete ${activity.title}`}
                      title="Delete"
                      onClick={() => {
                        setConfirmingId(activity.id);
                        setDeleteError(null);
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onPlay(activity)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors min-h-[42px] whitespace-nowrap"
                  >
                    <Play className="h-4 w-4" />
                    Open
                  </button>
                </div>
              </div>
              {confirmingId === activity.id && (
                <div role="alertdialog" aria-label="Confirm delete" className="mt-3 rounded-xl border-2 border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-sm font-semibold text-red-950">
                    Delete this lesson for everyone in the school? This can't be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      autoFocus
                      onClick={() => setConfirmingId(null)}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 min-h-[42px]"
                    >
                      No, keep it
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === activity.id}
                      onClick={() => confirmDelete(activity.id)}
                      className="flex-1 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60 min-h-[42px]"
                    >
                      {deletingId === activity.id ? 'Deleting…' : 'Yes, delete'}
                    </button>
                  </div>
                </div>
              )}
              {deleteError?.id === activity.id && (
                <p role="alert" className="mt-3 text-sm font-medium text-red-800">{deleteError.message}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

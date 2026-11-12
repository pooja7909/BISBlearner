import { useMemo, useState } from 'react';
import { Play, Search, Trash2 } from 'lucide-react';
import {
  ACTIVITY_FORMATS,
  DEFAULT_SUBJECTS,
  FORMAT_META,
  YEAR_GROUPS,
  type ActivityFormat,
  type ClassroomActivity,
  type SubjectArea,
  type YearGroup,
} from '../types.ts';

interface SchoolLibraryViewProps {
  activities: ClassroomActivity[];
  subjects?: string[];
  onPlay: (activity: ClassroomActivity) => void;
  onDelete: (id: string) => void;
}

export function SchoolLibraryView({
  activities,
  subjects = [...DEFAULT_SUBJECTS],
  onPlay,
  onDelete,
}: SchoolLibraryViewProps) {
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<'ALL' | YearGroup>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | SubjectArea>('ALL');
  const [formatFilter, setFormatFilter] = useState<'ALL' | ActivityFormat>('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((act) => {
      if (yearFilter !== 'ALL' && act.yearGroup !== yearFilter) return false;
      if (subjectFilter !== 'ALL' && act.subject !== subjectFilter) return false;
      if (formatFilter !== 'ALL' && act.format !== formatFilter) return false;
      if (q) {
        const hay = `${act.title} ${act.topic} ${act.subject} ${act.objectives.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activities, search, yearFilter, subjectFilter, formatFilter]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-950">
            Whole-School Activity Library
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Ready-to-run interactive starters, main tasks, and plenaries shared across year groups and subjects.
          </p>
        </div>
        <p className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
          Showing {filtered.length} of {activities.length} activities
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-5 relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topic, objective, or title…"
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none min-h-[44px]"
          />
        </div>

        <div className="lg:col-span-3">
          <select
            aria-label="Filter by Year Group"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value as 'ALL' | YearGroup)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none min-h-[44px]"
          >
            <option value="ALL">All Year Groups</option>
            {YEAR_GROUPS.map((yg) => (
              <option key={yg} value={yg}>
                {yg}
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
            <option value="ALL">All Subjects</option>
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
            <option value="ALL">All Formats</option>
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
            No matching activities found
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Clear your filters above or generate a brand-new activity for this topic in the Studio.
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
                  <span className="font-semibold text-slate-800">{activity.yearGroup}</span>
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
                  {activity.differentiation}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {!activity.isStarter && (
                    <button
                      type="button"
                      aria-label={`Delete ${activity.title}`}
                      onClick={() => onDelete(activity.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onPlay(activity)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors min-h-[40px] whitespace-nowrap"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Preview & Launch
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { ACTIVITY_GUIDES } from '../data/activityGuides.ts';
import { FORMAT_META, type ActivityFormat } from '../types.ts';

function guideKey(format: ActivityFormat): string {
  return `cs:guide-seen:${format}`;
}

function wasSeen(format: ActivityFormat): boolean {
  try {
    return window.localStorage.getItem(guideKey(format)) === '1';
  } catch {
    return false;
  }
}

/**
 * The step-by-step guide opens in full the first time a teacher meets a game type.
 * After that it starts folded away (one line with "How do I run this game?").
 * Returns [skipped, hide, show].
 */
export function useGuideSeen(format: ActivityFormat): [boolean, () => void, () => void] {
  const [skipped, setSkipped] = useState(() => wasSeen(format));
  useEffect(() => {
    setSkipped(wasSeen(format));
    try {
      window.localStorage.setItem(guideKey(format), '1');
    } catch {
      // ignore
    }
  }, [format]);
  return [skipped, () => setSkipped(true), () => setSkipped(false)];
}

interface ActivityGuideCardProps {
  format: ActivityFormat;
  isStudentMode?: boolean;
  skipped: boolean;
  onSkip: () => void;
  onShow: () => void;
}

export function ActivityGuideCard({
  format,
  isStudentMode = false,
  skipped,
  onSkip,
  onShow,
}: ActivityGuideCardProps) {
  const guide = ACTIVITY_GUIDES[format];
  const steps = isStudentMode ? guide.studentSteps : guide.teacherSteps;

  if (skipped) {
    return (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <BookOpen className="h-3.5 w-3.5 text-blue-700 shrink-0" />
          <span>
            <strong className="font-semibold text-slate-800">
              {FORMAT_META[format].label}:
            </strong>{' '}
            {guide.summary}
          </span>
        </div>
        <button
          type="button"
          onClick={onShow}
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 min-h-[36px]"
        >
          <ChevronDown className="h-4 w-4" />
          {isStudentMode ? 'How do I play?' : 'How do I run this game?'}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/40 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-800">
            <BookOpen className="h-3.5 w-3.5" />
            {isStudentMode ? 'How to play' : 'How to run this game'}
          </p>
          <p className="text-sm text-slate-700">{guide.summary}</p>
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:border-blue-400 transition-colors min-h-[38px] whitespace-nowrap shrink-0"
        >
          <ChevronUp className="h-3.5 w-3.5 text-blue-700" />
          Hide these steps
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step, idx) => (
          <div
            key={step.title}
            className="rounded-xl border border-slate-200/90 bg-white p-3.5 space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 tabular-nums">
                0{idx + 1}.
              </span>
              <h3 className="text-xs font-semibold text-slate-950 leading-snug">
                {step.title}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{step.detail}</p>
          </div>
        ))}
      </div>

      {!isStudentMode && (
        <div className="border-t border-blue-200/60 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            <strong className="text-slate-800">What pupils see on their own devices:</strong>{' '}
            {guide.studentSteps.map((s, i) => `${i + 1}) ${s.title}`).join(' · ')}
          </span>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Layers,
  Loader2,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  FORMAT_META,
  type ActivityPayload,
  type ClassroomActivity,
} from '../types.ts';
import { ActivityGuideCard } from './ActivityGuideCard.tsx';
import { parseJsonResponse, upsertLocalActivity } from '../utils/staticStorage.ts';

interface TeacherPreviewStageProps {
  activity: ClassroomActivity;
  packActivities?: ClassroomActivity[];
  onSelectPackActivity?: (act: ClassroomActivity) => void;
  onBack: () => void;
  onUpdated: (updated: ClassroomActivity) => void;
  onLaunch: (readyActivity: ClassroomActivity) => void;
}

function getItemCountLabel(payload: ActivityPayload): string {
  switch (payload.type) {
    case 'quiz':
      return `${payload.questions.length} questions`;
    case 'sort':
      return `${payload.items.length} cards · ${payload.buckets.length} buckets`;
    case 'sequence':
      return `${payload.steps.length} steps`;
    case 'match':
      return `${payload.pairs.length} pairs`;
    case 'cloze':
      return `${payload.segments.filter((s) => s.blankId).length} blanks`;
    case 'bingo':
      return `${payload.entries.length} Bingo clues`;
    case 'draw':
      return `${payload.checklist.length} goals · ${payload.labelChips.length} labels`;
    case 'wordcloud':
      return `${payload.seedWords.length} starter words`;
    case 'buzzer': {
      const count = payload.categories.reduce((acc, c) => acc + c.questions.length, 0);
      return `${count} tiles across ${payload.categories.length} categories`;
    }
    case 'escape':
      return `${payload.stages.length} lock stages`;
  }
}

export function TeacherPreviewStage({
  activity,
  packActivities = [],
  onSelectPackActivity,
  onBack,
  onUpdated,
  onLaunch,
}: TeacherPreviewStageProps) {
  const [draft, setDraft] = useState<ClassroomActivity>(activity);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandingCount, setExpandingCount] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [guideSkipped, setGuideSkipped] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [addingManual, setAddingManual] = useState(false);

  // Manual-add form fields
  const [newTitle, setNewTitle] = useState('');
  const [newSecondary, setNewSecondary] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectIdx, setNewCorrectIdx] = useState(0);
  const [newBucketOrCatIdx, setNewBucketOrCatIdx] = useState(0);
  const [newCodeDigit, setNewCodeDigit] = useState('5');

  useEffect(() => {
    setDraft(activity);
    setDirty(false);
    setEditingItemId(null);
    setAddingManual(false);
    setStatusMsg(null);
    setErrorMsg(null);
  }, [activity]);

  function resetManualForm() {
    setNewTitle('');
    setNewSecondary('');
    setNewNote('');
    setNewOptions(['', '', '', '']);
    setNewCorrectIdx(0);
    setNewBucketOrCatIdx(0);
    setNewCodeDigit(String(Math.floor(Math.random() * 9) + 1));
  }

  function updatePayload(nextPayload: ActivityPayload) {
    setDraft((prev) => ({ ...prev, payload: nextPayload }));
    setDirty(true);
    setStatusMsg(null);
  }

  async function persistChanges(target: ClassroomActivity): Promise<ClassroomActivity | null> {
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/activities/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: target.title,
          estimatedMinutes: target.estimatedMinutes,
          objectives: target.objectives,
          teacherTip: target.teacherTip,
          inclusionNote: target.inclusionNote,
          payload: target.payload,
        }),
      });
      const parsed = await parseJsonResponse<{ activity?: ClassroomActivity; error?: string }>(res);
      if (parsed.isJson) {
        if (!parsed.ok || !parsed.data.activity) {
          throw new Error(parsed.data.error || 'Could not save changes.');
        }
        setDraft(parsed.data.activity);
        setDirty(false);
        upsertLocalActivity(parsed.data.activity);
        onUpdated(parsed.data.activity);
        setStatusMsg('Changes saved to school library.');
        return parsed.data.activity;
      }
      upsertLocalActivity(target);
      setDraft(target);
      setDirty(false);
      onUpdated(target);
      setStatusMsg('Changes saved in browser.');
      return target;
    } catch (err) {
      if (err instanceof TypeError) {
        upsertLocalActivity(target);
        setDraft(target);
        setDirty(false);
        onUpdated(target);
        setStatusMsg('Changes saved in browser.');
        return target;
      }
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save activity.');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleLaunchNow() {
    if (dirty) {
      const saved = await persistChanges(draft);
      if (!saved) return;
      onLaunch(saved);
    } else {
      onLaunch(draft);
    }
  }

  async function handleGenerateMore(count: number) {
    setExpandingCount(count);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      // Save any local deletions/edits first so AI knows exact current items
      if (dirty) {
        const saved = await persistChanges(draft);
        if (!saved) {
          setExpandingCount(null);
          return;
        }
      }
      const res = await fetch(`/api/activities/${draft.id}/more-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      const parsed = await parseJsonResponse<{ activity?: ClassroomActivity; error?: string }>(res);
      if (!parsed.isJson) {
        throw new Error('Automatic question generation requires the live server. You can add or edit questions manually right below.');
      }
      if (!parsed.ok || !parsed.data.activity) {
        throw new Error(parsed.data.error || 'Could not generate more questions.');
      }
      setDraft(parsed.data.activity);
      setDirty(false);
      upsertLocalActivity(parsed.data.activity);
      onUpdated(parsed.data.activity);
      setStatusMsg('Added fresh curriculum items! Review them below before launching.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to add more items.');
    } finally {
      setExpandingCount(null);
    }
  }

  function handleAddManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = draft.payload;
    const uid = Math.random().toString(36).slice(2, 7);

    if (p.type === 'quiz') {
      if (!newTitle.trim()) return;
      const opts = newOptions.map((o, i) => o.trim() || `Option ${i + 1}`);
      updatePayload({
        ...p,
        questions: [
          ...p.questions,
          {
            id: `q-m-${uid}`,
            prompt: newTitle.trim(),
            options: opts,
            correctIndex: Math.max(0, Math.min(3, newCorrectIdx)),
            hint: newSecondary.trim() || 'Check the key concept from the lesson objective.',
            explanation: newNote.trim() || `The correct choice is "${opts[newCorrectIdx] || opts[0]}".`,
            discussionPrompt: 'Explain to a partner why the other options are incorrect.',
            tier: 'Core',
          },
        ],
      });
    } else if (p.type === 'sort') {
      if (!newTitle.trim() || p.buckets.length === 0) return;
      const targetBucket = p.buckets[newBucketOrCatIdx] ?? p.buckets[0];
      updatePayload({
        ...p,
        items: [
          ...p.items,
          {
            id: `item-m-${uid}`,
            text: newTitle.trim(),
            bucketId: targetBucket.id,
            reason: newNote.trim() || `Belongs in ${targetBucket.label}.`,
          },
        ],
      });
    } else if (p.type === 'sequence') {
      if (!newTitle.trim()) return;
      const nextSteps = [
        ...p.steps,
        {
          id: `step-m-${uid}`,
          order: p.steps.length + 1,
          label: newTitle.trim(),
          detail: newSecondary.trim() || 'Describe what happens in this stage.',
          clue: newNote.trim() || 'Look at what must come right before this step.',
        },
      ];
      updatePayload({ ...p, steps: nextSteps });
    } else if (p.type === 'match') {
      if (!newTitle.trim() || !newSecondary.trim()) return;
      updatePayload({
        ...p,
        pairs: [
          ...p.pairs,
          {
            id: `pair-m-${uid}`,
            left: newTitle.trim(),
            right: newSecondary.trim(),
            connectionNote: newNote.trim() || `${newTitle.trim()} pairs with ${newSecondary.trim()}.`,
          },
        ],
      });
    } else if (p.type === 'bingo') {
      if (!newTitle.trim() || !newSecondary.trim()) return;
      updatePayload({
        ...p,
        entries: [
          ...p.entries,
          {
            id: `bg-m-${uid}`,
            term: newTitle.trim(),
            clue: newSecondary.trim(),
          },
        ],
      });
    } else if (p.type === 'escape') {
      if (!newTitle.trim()) return;
      const opts = newOptions.map((o, i) => o.trim() || `Choice ${i + 1}`);
      updatePayload({
        ...p,
        stages: [
          ...p.stages,
          {
            id: `esc-m-${uid}`,
            stageTitle: `Lock ${p.stages.length + 1}`,
            riddle: newTitle.trim(),
            options: opts,
            correctIndex: Math.max(0, Math.min(3, newCorrectIdx)),
            codeDigit: (newCodeDigit.trim() || String(p.stages.length + 1)).slice(0, 2),
            hint: newSecondary.trim() || 'Re-read the clue carefully.',
            explanation: newNote.trim() || `Correct answer unlocks digit ${newCodeDigit || '1'}.`,
          },
        ],
      });
    } else if (p.type === 'buzzer') {
      if (!newTitle.trim() || p.categories.length === 0) return;
      const opts = newOptions.map((o, i) => o.trim() || `Option ${i + 1}`);
      const nextCats = p.categories.map((cat, idx) => {
        if (idx !== newBucketOrCatIdx) return cat;
        const maxPts = cat.questions.reduce((m, q) => Math.max(m, q.points), 0);
        return {
          ...cat,
          questions: [
            ...cat.questions,
            {
              id: `bz-m-${uid}`,
              points: maxPts + 100,
              prompt: newTitle.trim(),
              options: opts,
              correctIndex: Math.max(0, Math.min(3, newCorrectIdx)),
              explanation: newNote.trim() || `Worth ${maxPts + 100} points.`,
            },
          ],
        };
      });
      updatePayload({ ...p, categories: nextCats });
    } else if (p.type === 'cloze') {
      if (!newTitle.trim() || !newSecondary.trim()) return;
      const blankId = `b-m-${uid}`;
      const prefixText = newTitle.trim().endsWith(' ') ? newTitle.trim() : `${newTitle.trim()} `;
      updatePayload({
        ...p,
        segments: [
          ...p.segments,
          { text: ` ${prefixText}` },
          { blankId, answer: newSecondary.trim(), clue: newNote.trim() || 'Curriculum key term.' },
          { text: '.' },
        ],
      });
    } else if (p.type === 'draw') {
      if (!newTitle.trim()) return;
      if (newBucketOrCatIdx === 0) {
        updatePayload({ ...p, checklist: [...p.checklist, newTitle.trim()] });
      } else {
        updatePayload({ ...p, labelChips: [...p.labelChips, newTitle.trim()] });
      }
    } else if (p.type === 'wordcloud') {
      if (!newTitle.trim()) return;
      updatePayload({ ...p, seedWords: [...p.seedWords, newTitle.trim()] });
    }

    resetManualForm();
    setAddingManual(false);
  }

  const payload = draft.payload;

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Preview Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors min-h-[40px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          {dirty && (
            <button
              type="button"
              disabled={saving}
              onClick={() => persistChanges(draft)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 min-h-[42px] whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save Edits'}
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleLaunchNow}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors min-h-[44px] whitespace-nowrap"
          >
            <Play className="h-4 w-4" />
            {saving ? 'Saving & Launching…' : 'Launch Activity With Class →'}
          </button>
        </div>
      </div>

      {/* Lesson Pack Switcher if part of a 3-part pack */}
      {packActivities.length > 1 && onSelectPackActivity && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-2">
            <Layers className="h-3.5 w-3.5 text-blue-700" />
            Previewing 3-Part Lesson Pack:
          </span>
          {packActivities.map((act, idx) => {
            const stageLabel = idx === 0 ? '1. Starter' : idx === 1 ? '2. Main' : '3. Plenary';
            const isCurrent = act.id === draft.id;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => onSelectPackActivity(act)}
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
      )}

      {/* Teacher Preview Summary Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-2 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Teacher Preview & Question Editor
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span className="font-semibold text-slate-800">{draft.yearGroup}</span>
              <span aria-hidden="true">·</span>
              <span>{draft.subject}</span>
              <span aria-hidden="true">·</span>
              <span>{FORMAT_META[draft.format].label}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-semibold text-slate-800">
                {getItemCountLabel(payload)}
              </span>
            </div>
            <input
              type="text"
              aria-label="Activity Title"
              value={draft.title}
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, title: e.target.value }));
                setDirty(true);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 font-display text-2xl font-semibold text-slate-950 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="shrink-0 space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Estimated Mins
            </label>
            <input
              type="number"
              min={2}
              max={60}
              value={draft.estimatedMinutes}
              onChange={(e) => {
                setDraft((prev) => ({
                  ...prev,
                  estimatedMinutes: Math.max(2, Number(e.target.value) || 5),
                }));
                setDirty(true);
              }}
              className="w-24 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 font-mono text-base font-semibold text-slate-900 tabular-nums focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Full Step-by-Step Guide Preview (can be skipped by teacher) */}
        <ActivityGuideCard
          format={draft.format}
          isStudentMode={false}
          skipped={guideSkipped}
          onSkip={() => setGuideSkipped(true)}
          onShow={() => setGuideSkipped(false)}
        />

        {/* Toolbar: AI Expand + Manual Add */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="space-y-0.5">
            <h2 className="font-display text-base font-semibold text-slate-950">
              Review, Edit, Add, or Delete Questions & Content
            </h2>
            <p className="text-xs text-slate-600">
              Remove anything you do not like, tweak wording, or add extra questions before students see this activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-600 mr-0.5">Add questions:</span>
            {[2, 3, 5].map((cnt) => (
              <button
                key={cnt}
                type="button"
                disabled={expandingCount !== null}
                onClick={() => handleGenerateMore(cnt)}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-xs font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50 min-h-[38px] whitespace-nowrap tabular-nums"
              >
                {expandingCount === cnt && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {expandingCount === cnt ? `Adding +${cnt}…` : `+${cnt}`}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setAddingManual((v) => !v);
                resetManualForm();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors min-h-[38px] whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              {addingManual ? 'Close Form' : 'Add Item Manually'}
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-900">
            {errorMsg}
          </div>
        )}

        {/* Manual Add Form */}
        {addingManual && (
          <form
            onSubmit={handleAddManualSubmit}
            className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 space-y-4"
          >
            <h3 className="font-display text-sm font-semibold text-slate-950">
              Add a New {FORMAT_META[draft.format].shortLabel} Item
            </h3>

            {(payload.type === 'quiz' || payload.type === 'escape' || payload.type === 'buzzer') && (
              <div className="space-y-3">
                {payload.type === 'buzzer' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newBucketOrCatIdx}
                      onChange={(e) => setNewBucketOrCatIdx(Number(e.target.value))}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      {payload.categories.map((cat, idx) => (
                        <option key={cat.name} value={idx}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {payload.type === 'escape' ? 'Puzzle Riddle / Question' : 'Question Prompt'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter question or riddle…"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {newOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="new-correct-opt"
                        checked={newCorrectIdx === idx}
                        onChange={() => setNewCorrectIdx(idx)}
                        aria-label={`Mark Option ${idx + 1} correct`}
                        className="h-4 w-4 accent-blue-700"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) =>
                          setNewOptions((prev) =>
                            prev.map((v, i) => (i === idx ? e.target.value : v))
                          )
                        }
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm min-h-[38px]"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Select the radio button next to the correct answer.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {payload.type === 'escape' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Vault Code Digit / Letter
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={newCodeDigit}
                        onChange={(e) => setNewCodeDigit(e.target.value)}
                        className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Explanation (shown after answer)
                    </label>
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Why this answer is accurate…"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm min-h-[38px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {payload.type === 'sort' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Card Text
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Item or example…"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correct Bucket
                  </label>
                  <select
                    value={newBucketOrCatIdx}
                    onChange={(e) => setNewBucketOrCatIdx(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
                  >
                    {payload.buckets.map((b, i) => (
                      <option key={b.id} value={i}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason / Explanation
                  </label>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Why it belongs here…"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
                  />
                </div>
              </div>
            )}

            {payload.type === 'sequence' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Step Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Step heading…"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Step Detail
                  </label>
                  <input
                    type="text"
                    value={newSecondary}
                    onChange={(e) => setNewSecondary(e.target.value)}
                    placeholder="What happens in this step…"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Optional Clue
                  </label>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Ordering clue…"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
                  />
                </div>
              </div>
            )}

            {(payload.type === 'match' || payload.type === 'bingo' || payload.type === 'cloze') && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {payload.type === 'match'
                      ? payload.leftHeading
                      : payload.type === 'bingo'
                      ? 'Bingo Square Term'
                      : 'Sentence Start (before blank)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={
                      payload.type === 'cloze' ? 'e.g., Water boils at' : 'Term or prompt…'
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {payload.type === 'match'
                      ? payload.rightHeading
                      : payload.type === 'bingo'
                      ? 'Spoken Clue'
                      : 'Blank Answer Word'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newSecondary}
                    onChange={(e) => setNewSecondary(e.target.value)}
                    placeholder={
                      payload.type === 'cloze' ? 'e.g., 100°C' : 'Matching pair or clue…'
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {payload.type === 'cloze' ? 'Clue for Blank' : 'Note (optional)'}
                  </label>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Helpful hint…"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
                  />
                </div>
              </div>
            )}

            {(payload.type === 'draw' || payload.type === 'wordcloud') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {payload.type === 'draw' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Add As
                    </label>
                    <select
                      value={newBucketOrCatIdx}
                      onChange={(e) => setNewBucketOrCatIdx(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
                    >
                      <option value={0}>Checklist Goal</option>
                      <option value={1}>Stampable Vocabulary Label</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {payload.type === 'wordcloud' ? 'Starter Word' : 'Text'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter text…"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddingManual(false)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[38px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 min-h-[38px]"
              >
                Add to Activity
              </button>
            </div>
          </form>
        )}

        {/* Format-Specific Preview & Edit Lists */}
        {payload.type === 'quiz' && (
          <div className="space-y-3">
            {payload.questions.map((q, qIdx) => {
              const isEditing = editingItemId === q.id;
              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <p className="text-xs font-semibold text-slate-500 tabular-nums">
                        Question {qIdx + 1} · {q.tier}
                      </p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={q.prompt}
                          onChange={(e) =>
                            updatePayload({
                              ...payload,
                              questions: payload.questions.map((item) =>
                                item.id === q.id ? { ...item, prompt: e.target.value } : item
                              ),
                            })
                          }
                          className="w-full rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-semibold text-slate-950"
                        />
                      ) : (
                        <h3 className="font-display text-base font-semibold text-slate-950">
                          {q.prompt}
                        </h3>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingItemId(isEditing ? null : q.id)}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                        {isEditing ? 'Done' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        disabled={payload.questions.length <= 1}
                        aria-label={`Delete question ${qIdx + 1}`}
                        onClick={() =>
                          updatePayload({
                            ...payload,
                            questions: payload.questions.filter((item) => item.id !== q.id),
                          })
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-35"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => {
                      const isRight = oIdx === q.correctIndex;
                      return isEditing ? (
                        <div key={oIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`edit-${q.id}`}
                            checked={isRight}
                            onChange={() =>
                              updatePayload({
                                ...payload,
                                questions: payload.questions.map((item) =>
                                  item.id === q.id ? { ...item, correctIndex: oIdx } : item
                                ),
                              })
                            }
                            className="h-4 w-4 accent-emerald-700"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) =>
                              updatePayload({
                                ...payload,
                                questions: payload.questions.map((item) =>
                                  item.id === q.id
                                    ? {
                                        ...item,
                                        options: item.options.map((o, oi) =>
                                          oi === oIdx ? e.target.value : o
                                        ),
                                      }
                                    : item
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      ) : (
                        <div
                          key={oIdx}
                          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                            isRight
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-950 font-semibold'
                              : 'border-slate-200 bg-slate-50/50 text-slate-700'
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}. {opt}{' '}
                          {isRight && <span className="text-emerald-700 ml-1">(Answer)</span>}
                        </div>
                      );
                    })}
                  </div>

                  {isEditing ? (
                    <input
                      type="text"
                      value={q.explanation}
                      onChange={(e) =>
                        updatePayload({
                          ...payload,
                          questions: payload.questions.map((item) =>
                            item.id === q.id ? { ...item, explanation: e.target.value } : item
                          ),
                        })
                      }
                      placeholder="Explanation…"
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700"
                    />
                  ) : (
                    <p className="text-xs text-slate-600">
                      <strong className="text-slate-800">Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {payload.type === 'sort' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {payload.buckets.map((b) => (
                <div key={b.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <p className="font-display text-sm font-semibold text-slate-900">{b.label}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{b.description}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {payload.items.map((item, idx) => {
                const bucket = payload.buckets.find((b) => b.id === item.bucketId);
                const isEditing = editingItemId === item.id;
                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        Card {idx + 1} · Answer:{' '}
                        <strong className="text-blue-800">{bucket?.label}</strong>
                      </p>
                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) =>
                              updatePayload({
                                ...payload,
                                items: payload.items.map((x) =>
                                  x.id === item.id ? { ...x, text: e.target.value } : x
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-blue-300 px-2.5 py-1 text-sm font-semibold"
                          />
                          <select
                            value={item.bucketId}
                            onChange={(e) =>
                              updatePayload({
                                ...payload,
                                items: payload.items.map((x) =>
                                  x.id === item.id ? { ...x, bucketId: e.target.value } : x
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs"
                          >
                            {payload.buckets.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-950">{item.text}</p>
                          <p className="text-xs text-slate-600">{item.reason}</p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingItemId(isEditing ? null : item.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        aria-label="Edit card"
                      >
                        {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        disabled={payload.items.length <= 2}
                        aria-label={`Delete ${item.text}`}
                        onClick={() =>
                          updatePayload({
                            ...payload,
                            items: payload.items.filter((x) => x.id !== item.id),
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-35"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {payload.type === 'sequence' && (
          <div className="space-y-2.5">
            {payload.steps.map((step, idx) => {
              const isEditing = editingItemId === step.id;
              return (
                <div
                  key={step.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <span className="font-mono text-xs font-bold text-blue-700 mt-1 tabular-nums">
                      0{idx + 1}.
                    </span>
                    <div className="flex-1 space-y-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={step.label}
                            onChange={(e) =>
                              updatePayload({
                                ...payload,
                                steps: payload.steps.map((s) =>
                                  s.id === step.id ? { ...s, label: e.target.value } : s
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-blue-300 px-2.5 py-1 text-sm font-semibold"
                          />
                          <input
                            type="text"
                            value={step.detail}
                            onChange={(e) =>
                              updatePayload({
                                ...payload,
                                steps: payload.steps.map((s) =>
                                  s.id === step.id ? { ...s, detail: e.target.value } : s
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs"
                          />
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-950">{step.label}</p>
                          <p className="text-xs text-slate-600">{step.detail}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingItemId(isEditing ? null : step.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      aria-label="Edit step"
                    >
                      {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={payload.steps.length <= 2}
                      onClick={() => {
                        const filtered = payload.steps
                          .filter((s) => s.id !== step.id)
                          .map((s, i) => ({ ...s, order: i + 1 }));
                        updatePayload({ ...payload, steps: filtered });
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-35"
                      aria-label={`Delete step ${idx + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {payload.type === 'match' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {payload.pairs.map((pair, idx) => {
              const isEditing = editingItemId === pair.id;
              return (
                <div
                  key={pair.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                >
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-medium text-slate-400">Pair {idx + 1}</p>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={pair.left}
                          onChange={(e) =>
                            updatePayload({
                              ...payload,
                              pairs: payload.pairs.map((x) =>
                                x.id === pair.id ? { ...x, left: e.target.value } : x
                              ),
                            })
                          }
                          className="w-full rounded-lg border border-blue-300 px-2.5 py-1 text-xs font-semibold"
                        />
                        <input
                          type="text"
                          value={pair.right}
                          onChange={(e) =>
                            updatePayload({
                              ...payload,
                              pairs: payload.pairs.map((x) =>
                                x.id === pair.id ? { ...x, right: e.target.value } : x
                              ),
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-950">
                          {pair.left} <span className="text-blue-600 mx-1">↔</span> {pair.right}
                        </p>
                        {pair.connectionNote && (
                          <p className="text-xs text-slate-600">{pair.connectionNote}</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingItemId(isEditing ? null : pair.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      aria-label="Edit pair"
                    >
                      {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={payload.pairs.length <= 2}
                      onClick={() =>
                        updatePayload({
                          ...payload,
                          pairs: payload.pairs.filter((x) => x.id !== pair.id),
                        })
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-35"
                      aria-label={`Delete pair ${idx + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {payload.type === 'bingo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {payload.entries.map((entry, idx) => {
              const isEditing = editingItemId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                >
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-medium text-slate-400">Entry {idx + 1}</p>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={entry.term}
                          onChange={(e) =>
                            updatePayload({
                              ...payload,
                              entries: payload.entries.map((x) =>
                                x.id === entry.id ? { ...x, term: e.target.value } : x
                              ),
                            })
                          }
                          className="w-full rounded-lg border border-blue-300 px-2.5 py-1 text-sm font-semibold"
                        />
                        <input
                          type="text"
                          value={entry.clue}
                          onChange={(e) =>
                            updatePayload({
                              ...payload,
                              entries: payload.entries.map((x) =>
                                x.id === entry.id ? { ...x, clue: e.target.value } : x
                              ),
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-950">{entry.term}</p>
                        <p className="text-xs text-slate-600">{entry.clue}</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingItemId(isEditing ? null : entry.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      aria-label="Edit bingo entry"
                    >
                      {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={payload.entries.length <= 9}
                      title={
                        payload.entries.length <= 9
                          ? 'Bingo requires at least 9 entries for the 3×3 grid'
                          : 'Delete entry'
                      }
                      onClick={() =>
                        updatePayload({
                          ...payload,
                          entries: payload.entries.filter((x) => x.id !== entry.id),
                        })
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-35"
                      aria-label={`Delete ${entry.term}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {payload.type === 'escape' && (
          <div className="space-y-3">
            {payload.stages.map((st, idx) => {
              const isEditing = editingItemId === st.id;
              return (
                <div
                  key={st.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-semibold text-blue-700">
                        {st.stageTitle} · Code Digit: <span className="font-mono">{st.codeDigit}</span>
                      </p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={st.riddle}
                          onChange={(e) =>
                            updatePayload({
                              ...payload,
                              stages: payload.stages.map((s) =>
                                s.id === st.id ? { ...s, riddle: e.target.value } : s
                              ),
                            })
                          }
                          className="w-full rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-semibold"
                        />
                      ) : (
                        <h3 className="font-display text-base font-semibold text-slate-950">
                          {st.riddle}
                        </h3>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingItemId(isEditing ? null : st.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                        {isEditing ? 'Done' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        disabled={payload.stages.length <= 1}
                        onClick={() =>
                          updatePayload({
                            ...payload,
                            stages: payload.stages.filter((s) => s.id !== st.id),
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-35"
                        aria-label={`Delete lock ${idx + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {st.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                          oIdx === st.correctIndex
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-950 font-semibold'
                            : 'border-slate-200 bg-slate-50/50 text-slate-700'
                        }`}
                      >
                        {opt} {oIdx === st.correctIndex && '(Answer)'}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {payload.type === 'buzzer' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {payload.categories.map((cat, cIdx) => (
              <div
                key={cat.name}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
              >
                <h3 className="font-display text-sm font-semibold text-slate-950">{cat.name}</h3>
                {cat.questions.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 tabular-nums">
                        {q.points} pts
                      </span>
                      <button
                        type="button"
                        disabled={cat.questions.length <= 1}
                        onClick={() =>
                          updatePayload({
                            ...payload,
                            categories: payload.categories.map((c, ci) =>
                              ci === cIdx
                                ? { ...c, questions: c.questions.filter((item) => item.id !== q.id) }
                                : c
                            ),
                          })
                        }
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-700 disabled:opacity-30"
                        aria-label={`Delete ${q.points} point question`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">{q.prompt}</p>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      Answer: {q.options[q.correctIndex]}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {payload.type === 'cloze' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-800">
              {payload.segments.map((seg, idx) =>
                seg.blankId ? (
                  <span
                    key={seg.blankId}
                    className="mx-1 inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-950"
                  >
                    {seg.answer}
                    <button
                      type="button"
                      onClick={() =>
                        updatePayload({
                          ...payload,
                          segments: payload.segments.filter((_, i) => i !== idx),
                        })
                      }
                      aria-label={`Remove blank ${seg.answer}`}
                      className="text-emerald-700 hover:text-red-700 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ) : (
                  <span key={`t-${idx}`}>{seg.text}</span>
                )
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <strong className="text-slate-800">Distractor words:</strong>
              {payload.distractors.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    updatePayload({
                      ...payload,
                      distractors: payload.distractors.filter((x) => x !== d),
                    })
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-red-300 hover:text-red-700"
                  title="Click to remove distractor"
                >
                  {d} ×
                </button>
              ))}
            </div>
          </div>
        )}

        {payload.type === 'draw' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Checklist Goals ({payload.checklist.length})
              </h3>
              {payload.checklist.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-900">{item}</span>
                  <button
                    type="button"
                    disabled={payload.checklist.length <= 1}
                    onClick={() =>
                      updatePayload({
                        ...payload,
                        checklist: payload.checklist.filter((_, i) => i !== idx),
                      })
                    }
                    className="text-slate-400 hover:text-red-700 disabled:opacity-30"
                    aria-label="Delete checklist item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-2 rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Vocabulary Labels ({payload.labelChips.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {payload.labelChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      updatePayload({
                        ...payload,
                        labelChips: payload.labelChips.filter((_, i) => i !== idx),
                      })
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-red-300 hover:text-red-700"
                  >
                    {chip} ×
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {payload.type === 'wordcloud' && (
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-950">Prompt: {payload.prompt}</p>
            <div className="flex flex-wrap gap-2">
              {payload.seedWords.map((word, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    updatePayload({
                      ...payload,
                      seedWords: payload.seedWords.filter((_, i) => i !== idx),
                    })
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-red-300 hover:text-red-700"
                >
                  {word} ×
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

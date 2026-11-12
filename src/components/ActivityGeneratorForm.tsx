import { useState } from 'react';
import { FileText, Layers, Loader2, Plus, Sparkles, UploadCloud, X } from 'lucide-react';
import {
  ACTIVITY_FORMATS,
  DIFFERENTIATION_TIERS,
  FORMAT_META,
  YEAR_GROUPS,
  type ActivityFormat,
  type ClassroomActivity,
  type DifferentiationTier,
  type SubjectArea,
  type YearGroup,
} from '../types.ts';
import { loadLocalSubjects, parseJsonResponse, saveLocalSubjects } from '../utils/staticStorage.ts';

interface ActivityGeneratorFormProps {
  subjects: string[];
  onSubjectAdded: (subjects: string[], added: string) => void;
  onGenerated: (activities: ClassroomActivity[], primary: ClassroomActivity) => void;
}

interface SamplePrompt {
  label: string;
  topic: string;
  yearGroup: YearGroup;
  subject: SubjectArea;
  objectives: string;
  format: ActivityFormat;
}

const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    label: 'Reception · Counting & Grouping Shapes',
    topic: '2D Shapes Around Our Classroom',
    yearGroup: 'EYFS (Ages 4-5)',
    subject: 'Mathematics',
    objectives:
      'Recognise circles, triangles, squares, and rectangles by counting their sides and corners.\nSpot everyday classroom objects that match each shape.',
    format: 'sort',
  },
  {
    label: 'Year 4 · States of Matter',
    topic: 'Solids, Liquids, and Gases',
    yearGroup: 'Year 3-4 (Lower KS2)',
    subject: 'Science',
    objectives:
      'Compare and group materials together according to whether they are solids, liquids, or gases.\nExplain how heating and cooling change water between states.',
    format: 'bingo',
  },
  {
    label: 'Year 8 · Coding & Loops Duel',
    topic: 'Iteration, Loops & Logic in Python',
    yearGroup: 'Year 7-9 (KS3)',
    subject: 'Computing',
    objectives:
      'Distinguish between count-controlled (for) loops and condition-controlled (while) loops.\nTrace step-by-step how a loop updates a variable.',
    format: 'buzzer',
  },
  {
    label: 'Year 8 · French Café & Ordering',
    topic: 'Au Café — Ordering Food, Polite Phrases & Numbers',
    yearGroup: 'Year 7-9 (KS3)',
    subject: 'French',
    objectives:
      'Match everyday French café phrases and prices to accurate English meanings.\nUse polite greetings and accent marks correctly when ordering.',
    format: 'match',
  },
  {
    label: 'Year 10 · Chemistry Codebreaker',
    topic: 'Atomic Structure & Periodic Table',
    yearGroup: 'Year 10-11 (GCSE)',
    subject: 'Science',
    objectives:
      'Deduce proton, neutron, and electron counts from atomic numbers and mass numbers.\nLink Group 1 and Group 7 reactivity to outer electron shells.',
    format: 'escape',
  },
];

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export function ActivityGeneratorForm({
  subjects,
  onSubjectAdded,
  onGenerated,
}: ActivityGeneratorFormProps) {
  const [sourceTab, setSourceTab] = useState<'topic' | 'file'>('topic');

  const [topic, setTopic] = useState('');
  const [yearGroup, setYearGroup] = useState<YearGroup>('Year 7-9 (KS3)');
  const [subject, setSubject] = useState<SubjectArea>('Science');
  const [addingSubject, setAddingSubject] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);
  const [subjectError, setSubjectError] = useState<string | null>(null);

  const [objectivesText, setObjectivesText] = useState('');
  const [format, setFormat] = useState<ActivityFormat>('bingo');
  const [differentiation, setDifferentiation] =
    useState<DifferentiationTier>('All Learners');
  const [questionCount, setQuestionCount] = useState<number | ''>('');
  const [generatePack, setGeneratePack] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveNewSubject() {
    const clean = customSubjectInput.trim();
    if (!clean) {
      setSubjectError('Enter a subject or world language name.');
      return;
    }
    setSavingSubject(true);
    setSubjectError(null);
    const applyLocalSubject = () => {
      const current = loadLocalSubjects();
      const existing = current.find((s) => s.toLowerCase() === clean.toLowerCase());
      const added = existing || clean;
      const next = existing ? current : [...current, added];
      saveLocalSubjects(next);
      onSubjectAdded(next, added);
      setSubject(added);
      setCustomSubjectInput('');
      setAddingSubject(false);
    };
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean }),
      });
      const parsed = await parseJsonResponse<{ subjects?: string[]; subject?: string; error?: string }>(res);
      if (parsed.isJson) {
        if (!parsed.ok) {
          throw new Error(parsed.data.error || 'Could not add subject.');
        }
        if (Array.isArray(parsed.data.subjects)) {
          saveLocalSubjects(parsed.data.subjects);
          onSubjectAdded(parsed.data.subjects, parsed.data.subject || clean);
        }
        setSubject(parsed.data.subject || clean);
        setCustomSubjectInput('');
        setAddingSubject(false);
      } else {
        applyLocalSubject();
      }
    } catch (err) {
      if (err instanceof TypeError) {
        applyLocalSubject();
      } else {
        setSubjectError(err instanceof Error ? err.message : 'Unable to save subject.');
      }
    } finally {
      setSavingSubject(false);
    }
  }

  function applySample(sample: SamplePrompt) {
    setSourceTab('topic');
    setTopic(sample.topic);
    setYearGroup(sample.yearGroup);
    setSubject(sample.subject);
    setObjectivesText(sample.objectives);
    setFormat(sample.format);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const objectives = objectivesText
      .split('\n')
      .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter(Boolean);

    if (sourceTab === 'file') {
      if (!selectedFile) {
        setError('Choose a presentation (.pptx), PDF, image, or document file to upload.');
        return;
      }
      if (selectedFile.size > 14 * 1024 * 1024) {
        setError('Please upload a file smaller than 14 MB.');
        return;
      }

      setLoading(true);
      try {
        const base64Data = await readFileAsBase64(selectedFile);
        const res = await fetch('/api/activities/generate-from-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: selectedFile.name,
            mimeType: selectedFile.type || 'application/octet-stream',
            base64Data,
            topic: topic.trim() || undefined,
            yearGroup,
            subject,
            objectives,
            format,
            differentiation,
            generatePack,
            questionCount: typeof questionCount === 'number' ? questionCount : undefined,
          }),
        });
        const parsed = await parseJsonResponse<{
          activities?: ClassroomActivity[];
          primary?: ClassroomActivity;
          error?: string;
        }>(res);
        if (!parsed.isJson) {
          throw new Error('File upload generation requires the live server (npm start) with GEMINI_API_KEY configured. Ready-made School Library activities and question editing work directly here.');
        }
        if (!parsed.ok || !Array.isArray(parsed.data.activities)) {
          throw new Error(parsed.data.error || 'Could not create activity from file.');
        }
        onGenerated(parsed.data.activities, parsed.data.primary ?? parsed.data.activities[0]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'File upload generation failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!topic.trim()) {
      setError('Enter a lesson topic to build your classroom activity.');
      return;
    }
    if (objectives.length === 0) {
      setError('Add at least one lesson objective so the activity targets what students need to learn.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/activities/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          yearGroup,
          subject,
          objectives,
          format,
          differentiation,
          generatePack,
          questionCount: typeof questionCount === 'number' ? questionCount : undefined,
        }),
      });
      const parsed = await parseJsonResponse<{
        activities?: ClassroomActivity[];
        primary?: ClassroomActivity;
        activity?: ClassroomActivity;
        error?: string;
      }>(res);
      if (!parsed.isJson) {
        throw new Error('Activity generation requires the live server (npm start) with GEMINI_API_KEY configured. Ready-made School Library activities and question editing work directly here.');
      }
      if (!parsed.ok) {
        throw new Error(parsed.data.error || 'Unable to generate activity.');
      }
      if (generatePack && Array.isArray(parsed.data.activities)) {
        onGenerated(parsed.data.activities, parsed.data.primary ?? parsed.data.activities[0]);
      } else if (parsed.data.activity) {
        onGenerated([parsed.data.activity], parsed.data.activity);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-950">
            Create an Interactive Classroom Activity
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Type your topic and objectives, or upload slides, PDFs, or worksheet photos to turn them into live play.
          </p>
        </div>

        {/* Source Switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSourceTab('topic');
              setError(null);
            }}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors min-h-[38px] whitespace-nowrap ${
              sourceTab === 'topic'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            From Topic & Objectives
          </button>
          <button
            type="button"
            onClick={() => {
              setSourceTab('file');
              setError(null);
            }}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors min-h-[38px] whitespace-nowrap ${
              sourceTab === 'file'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Upload Slides / PDF / Image
          </button>
        </div>
      </div>

      {sourceTab === 'topic' && (
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quick-fill whole-school examples
          </p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => applySample(sample)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-950 transition-colors min-h-[36px] whitespace-nowrap"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {sourceTab === 'file' && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-900">
              Upload Presentation, PDF, Image, or Notes
            </label>
            {!selectedFile ? (
              <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-colors">
                <UploadCloud className="h-8 w-8 text-blue-700 mb-2" />
                <span className="text-sm font-semibold text-slate-900">
                  Click to choose a file from your device
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  Supports PowerPoint (.pptx), PDF, Images (.png, .jpg, .webp), Word (.docx), Text & CSV
                </span>
                <input
                  type="file"
                  accept=".pptx,.pdf,.docx,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp,.gif,application/pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    setError(null);
                  }}
                  className="sr-only"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-6 w-6 text-blue-700 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-600 tabular-nums">
                      {(selectedFile.size / 1024).toFixed(0)} KB · Ready to transform into an activity
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-slate-600 hover:text-red-700 shrink-0"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-6 space-y-1.5">
            <label htmlFor="topic-input" className="block text-sm font-semibold text-slate-900">
              {sourceTab === 'file' ? 'Lesson Topic (Optional — auto-detected from file)' : 'Lesson Topic'}
            </label>
            <input
              id="topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Volcanoes & Plate Tectonics, Fractions, Macbeth"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 min-h-[44px]"
            />
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label htmlFor="year-select" className="block text-sm font-semibold text-slate-900">
              Year Group
            </label>
            <select
              id="year-select"
              value={yearGroup}
              onChange={(e) => setYearGroup(e.target.value as YearGroup)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 min-h-[44px]"
            >
              {YEAR_GROUPS.map((yg) => (
                <option key={yg} value={yg}>
                  {yg}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="subject-select" className="block text-sm font-semibold text-slate-900">
                Subject or Language
              </label>
              <button
                type="button"
                onClick={() => {
                  setAddingSubject((prev) => !prev);
                  setSubjectError(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                {addingSubject ? 'Cancel' : 'Add subject'}
              </button>
            </div>
            <select
              id="subject-select"
              value={subject}
              onChange={(e) => {
                if (e.target.value === '__ADD_NEW__') {
                  setAddingSubject(true);
                  setSubjectError(null);
                } else {
                  setSubject(e.target.value);
                }
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 min-h-[44px]"
            >
              {subjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
              <option value="__ADD_NEW__">+ Add new subject or language…</option>
            </select>
            {addingSubject && (
              <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveNewSubject();
                      }
                    }}
                    placeholder="e.g., Drama, Latin, Italian, Polish"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none min-h-[36px]"
                  />
                  <button
                    type="button"
                    disabled={savingSubject}
                    onClick={handleSaveNewSubject}
                    className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60 min-h-[36px] whitespace-nowrap shrink-0"
                  >
                    {savingSubject ? 'Adding…' : 'Add'}
                  </button>
                </div>
                {subjectError && (
                  <p className="text-[11px] font-medium text-red-700">{subjectError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="objectives-input" className="block text-sm font-semibold text-slate-900">
            {sourceTab === 'file'
              ? 'Custom Lesson Objectives (Optional — inferred from file if blank)'
              : 'Lesson Objectives (one per line)'}
          </label>
          <textarea
            id="objectives-input"
            rows={3}
            value={objectivesText}
            onChange={(e) => setObjectivesText(e.target.value)}
            placeholder={`Describe what students should understand or practise.\nFor example:\n- Identify key cell organelles and explain each function.\n- Apply key terminology accurately in class play.`}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        {/* All 10 Interactive Format Cards */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">
              Interactive Activity Format (10 Classroom Modes)
            </span>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={generatePack}
                onChange={(e) => setGeneratePack(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <Layers className="h-3.5 w-3.5 text-blue-700" />
              Build 3-Part Lesson Pack (Sort + Team Duel + Bingo)
            </label>
          </div>

          {!generatePack && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {ACTIVITY_FORMATS.map((fmt) => {
                const meta = FORMAT_META[fmt];
                const isSelected = format === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/15'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <span className="text-sm font-semibold text-slate-950">
                      {meta.shortLabel}
                    </span>
                    <span className="mt-1 text-xs text-slate-600 leading-snug">
                      {meta.summary}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Differentiation Focus, Item Count & Submit */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-t border-slate-200 pt-5">
          <div className="flex flex-wrap items-end gap-5">
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Learner Inclusion Focus
              </span>
              <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1">
                {DIFFERENTIATION_TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setDifferentiation(tier)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors min-h-[36px] whitespace-nowrap ${
                      differentiation === tier
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="question-count-select"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Questions / Items
              </label>
              <select
                id="question-count-select"
                value={questionCount}
                onChange={(e) =>
                  setQuestionCount(e.target.value ? Number(e.target.value) : '')
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none min-h-[42px]"
              >
                <option value="">Standard (Auto)</option>
                <option value={5}>5 items</option>
                <option value={8}>8 items</option>
                <option value={10}>10 items</option>
                <option value={12}>12 items</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors min-h-[48px] whitespace-nowrap shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {sourceTab === 'file'
                  ? 'Reading File & Building…'
                  : generatePack
                  ? 'Building 3 Activities…'
                  : 'Building Activity…'}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {generatePack
                  ? 'Build & Preview 3-Part Pack'
                  : sourceTab === 'file'
                  ? 'Preview Activity from File'
                  : 'Build & Preview Activity'}
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-900">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}

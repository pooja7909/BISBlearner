import { useState } from 'react';
import { ChevronDown, FileText, Loader2, Sparkles, UploadCloud, X } from 'lucide-react';
import {
  ACTIVITY_FORMATS,
  DIFFERENTIATION_TIERS,
  EXACT_YEARS,
  FORMAT_META,
  TIER_LABELS,
  bandForYear,
  packFormatsFor,
  type ActivityFormat,
  type ClassroomActivity,
  type DifferentiationTier,
  type SubjectArea,
} from '../types.ts';

interface ActivityGeneratorFormProps {
  subjects: string[];
  onSubjectAdded: (subjects: string[], added: string) => void;
  onGenerated: (activities: ClassroomActivity[], primary: ClassroomActivity) => void;
}

interface SamplePrompt {
  label: string;
  topic: string;
  exactYear: string;
  subject: SubjectArea;
  objectives: string;
}

const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    label: 'Reception · 2D shapes',
    topic: '2D shapes around our classroom',
    exactYear: 'Reception',
    subject: 'Mathematics',
    objectives:
      'Recognise circles, triangles, squares and rectangles by counting their sides and corners.\nSpot everyday classroom objects that match each shape.',
  },
  {
    label: 'Year 4 · States of matter',
    topic: 'Solids, liquids and gases',
    exactYear: 'Year 4',
    subject: 'Science',
    objectives:
      'Group materials into solids, liquids and gases.\nExplain how heating and cooling change water between states.',
  },
  {
    label: 'Year 8 · French café',
    topic: 'Au café: ordering food and drink',
    exactYear: 'Year 8',
    subject: 'French',
    objectives:
      'Match everyday café phrases to their English meanings.\nUse polite greetings when ordering.',
  },
  {
    label: 'Year 10 · Atomic structure',
    topic: 'Atomic structure and the periodic table',
    exactYear: 'Year 10',
    subject: 'Science',
    objectives:
      'Work out protons, neutrons and electrons from atomic and mass numbers.\nLink Group 1 and Group 7 reactivity to outer electrons.',
  },
];

const ADD_SUBJECT = '__ADD_NEW__';

function readStored(key: string): string {
  try {
    return window.localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function store(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not open that file. Please try a different one.'));
    reader.readAsDataURL(file);
  });
}

function StepLabel({ n, htmlFor, children }: { n: number; htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-2.5 text-base font-semibold text-slate-950">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
        {n}
      </span>
      {children}
    </label>
  );
}

export function ActivityGeneratorForm({ subjects, onSubjectAdded, onGenerated }: ActivityGeneratorFormProps) {
  const [topic, setTopic] = useState('');
  const [exactYear, setExactYear] = useState(() => readStored('cs:last-year'));
  const [subject, setSubject] = useState<SubjectArea>(() => readStored('cs:last-subject') || 'Science');
  const [addingSubject, setAddingSubject] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [objectivesText, setObjectivesText] = useState('');

  // "More options" (hidden by default)
  const [showMore, setShowMore] = useState(false);
  const [makeWhat, setMakeWhat] = useState<'lesson' | 'single'>('lesson');
  const [format, setFormat] = useState<ActivityFormat>('quiz');
  const [differentiation, setDifferentiation] = useState<DifferentiationTier>('All Learners');
  const [questionCount, setQuestionCount] = useState<number | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePack = makeWhat === 'lesson';
  const packPreview = exactYear
    ? packFormatsFor(bandForYear(exactYear)).map((f) => FORMAT_META[f].shortLabel.toLowerCase())
    : null;

  async function handleSaveNewSubject() {
    const clean = customSubjectInput.trim();
    if (!clean) {
      setSubjectError('Type the subject name first.');
      return;
    }
    setSavingSubject(true);
    setSubjectError(null);
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add that subject.');
      if (Array.isArray(data.subjects)) onSubjectAdded(data.subjects, data.subject || clean);
      setSubject(data.subject || clean);
      setCustomSubjectInput('');
      setAddingSubject(false);
    } catch (err) {
      setSubjectError(err instanceof Error ? err.message : 'Could not add that subject.');
    } finally {
      setSavingSubject(false);
    }
  }

  function applySample(sample: SamplePrompt) {
    setTopic(sample.topic);
    setExactYear(sample.exactYear);
    setSubject(sample.subject);
    setObjectivesText(sample.objectives);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedFile && !topic.trim()) {
      setError('Step 1: type what you are teaching, for example "Fractions" or "The Romans".');
      document.getElementById('topic-input')?.focus();
      return;
    }
    if (!exactYear) {
      setError('Step 2: choose the year group.');
      document.getElementById('year-select')?.focus();
      return;
    }

    let objectives = objectivesText
      .split('\n')
      .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter(Boolean);
    // Objectives are optional for the teacher: fall back to a sensible one.
    if (objectives.length === 0 && !selectedFile) {
      objectives = [`Understand and remember the key ideas about ${topic.trim()}`];
    }

    store('cs:last-year', exactYear);
    store('cs:last-subject', subject);

    const common = {
      exactYear,
      yearGroup: bandForYear(exactYear),
      subject,
      objectives,
      format,
      differentiation,
      generatePack,
      questionCount: typeof questionCount === 'number' ? questionCount : undefined,
    };

    setLoading(true);
    try {
      if (selectedFile) {
        if (selectedFile.size > 14 * 1024 * 1024) {
          throw new Error('That file is too big (over 14 MB). Try saving it as a PDF, or upload fewer slides.');
        }
        const base64Data = await readFileAsBase64(selectedFile);
        const res = await fetch('/api/activities/generate-from-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...common,
            fileName: selectedFile.name,
            mimeType: selectedFile.type || 'application/octet-stream',
            base64Data,
            topic: topic.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not make a lesson from that file.');
        onGenerated(data.activities, data.primary ?? data.activities[0]);
        return;
      }

      const res = await fetch('/api/activities/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...common, topic: topic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not make the lesson.');
      if (generatePack && Array.isArray(data.activities)) {
        onGenerated(data.activities, data.primary ?? data.activities[0]);
      } else if (data.activity) {
        onGenerated([data.activity], data.activity);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Check the internet connection and press the button again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-950">Make a lesson game</h2>
        <p className="mt-1 text-base text-slate-600">
          Fill in the boxes and press the blue button. It takes about 30 seconds.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7" aria-busy={loading}>
        <fieldset disabled={loading} className="space-y-7">
          {/* Step 1 */}
          <div className="space-y-2">
            <StepLabel n={1} htmlFor="topic-input">
              What are you teaching?
              {selectedFile && <span className="text-sm font-normal text-slate-500">(optional when using a file)</span>}
            </StepLabel>
            <input
              id="topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="For example: Fractions, The Romans, Plants, Macbeth"
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/15"
            />
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <StepLabel n={2} htmlFor="year-select">Who is it for?</StepLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="block text-sm text-slate-600">Year group</span>
                <select
                  id="year-select"
                  value={exactYear}
                  onChange={(e) => setExactYear(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/15"
                >
                  <option value="" disabled>
                    Choose a year group…
                  </option>
                  {EXACT_YEARS.map((y) => (
                    <option key={y.label} value={y.label}>
                      {y.label} (age {y.age})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <span className="block text-sm text-slate-600">Subject</span>
                <select
                  id="subject-select"
                  aria-label="Subject"
                  value={addingSubject ? ADD_SUBJECT : subject}
                  onChange={(e) => {
                    if (e.target.value === ADD_SUBJECT) {
                      setAddingSubject(true);
                      setSubjectError(null);
                    } else {
                      setAddingSubject(false);
                      setSubject(e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/15"
                >
                  {subjects.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                  <option value={ADD_SUBJECT}>+ My subject isn't listed…</option>
                </select>
                {addingSubject && (
                  <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 space-y-2">
                    <label htmlFor="new-subject" className="block text-sm font-medium text-slate-800">
                      Type the subject name
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="new-subject"
                        type="text"
                        value={customSubjectInput}
                        onChange={(e) => setCustomSubjectInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveNewSubject();
                          }
                        }}
                        placeholder="e.g. Drama, Latin, Italian"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={savingSubject}
                        onClick={handleSaveNewSubject}
                        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 min-h-[42px] whitespace-nowrap"
                      >
                        {savingSubject ? 'Adding…' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingSubject(false)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 min-h-[42px]"
                      >
                        Cancel
                      </button>
                    </div>
                    {subjectError && <p className="text-sm font-medium text-red-700">{subjectError}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <StepLabel n={3} htmlFor="objectives-input">
              What should pupils learn?
              <span className="text-sm font-normal text-slate-500">(optional, but it helps)</span>
            </StepLabel>
            <textarea
              id="objectives-input"
              rows={3}
              value={objectivesText}
              onChange={(e) => setObjectivesText(e.target.value)}
              placeholder={'Write one idea per line, for example:\nName the parts of a plant\nExplain what each part does'}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/15"
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-sm text-slate-600">Not sure what to write? Try an example:</span>
              {SAMPLE_PROMPTS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => applySample(sample)}
                  className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-blue-300 bg-blue-50 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-6 w-6 text-blue-700 shrink-0" />
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-950 truncate">Using your file: {selectedFile.name}</p>
                  <p className="text-sm text-slate-600">The games will be made from what is in this file.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:text-red-700 shrink-0"
              >
                <X className="h-4 w-4" />
                Don't use file
              </button>
            </div>
          )}

          {/* More options */}
          <div className="rounded-xl border border-slate-200">
            <button
              type="button"
              aria-expanded={showMore}
              onClick={() => setShowMore((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-base font-semibold text-slate-800 hover:bg-slate-50 rounded-xl"
            >
              <span>
                More options{' '}
                <span className="font-normal text-slate-500 text-sm">
                  (use my slides, choose the game, extra support or challenge)
                </span>
              </span>
              <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${showMore ? 'rotate-180' : ''}`} />
            </button>

            {showMore && (
              <div className="space-y-6 border-t border-slate-200 p-4 sm:p-5">
                {/* Upload */}
                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-900">Start from my own slides or worksheet</p>
                  {!selectedFile ? (
                    <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-colors">
                      <UploadCloud className="h-7 w-7 text-blue-700 mb-1.5" />
                      <span className="text-base font-semibold text-slate-900">Choose a file from your computer</span>
                      <span className="mt-1 text-sm text-slate-500">
                        PowerPoint, PDF, Word, or a photo of a worksheet
                      </span>
                      <input
                        type="file"
                        accept=".pptx,.pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.gif,application/pdf,image/*"
                        onChange={(e) => {
                          setSelectedFile(e.target.files?.[0] || null);
                          setError(null);
                        }}
                        className="sr-only"
                      />
                    </label>
                  ) : (
                    <p className="text-sm text-slate-600">File chosen: {selectedFile.name} (shown above).</p>
                  )}
                </div>

                {/* What to make */}
                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-900">What should I make?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(
                      [
                        ['lesson', 'A full lesson (3 games)', 'Recommended. Start, main and end games.'],
                        ['single', 'Just one game', 'You choose which game below.'],
                      ] as const
                    ).map(([value, title, help]) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${
                          makeWhat === value ? 'border-blue-600 bg-blue-50/60' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="make-what"
                          value={value}
                          checked={makeWhat === value}
                          onChange={() => setMakeWhat(value)}
                          className="mt-1 h-4 w-4"
                        />
                        <span>
                          <span className="block text-base font-semibold text-slate-950">{title}</span>
                          <span className="block text-sm text-slate-600">{help}</span>
                        </span>
                      </label>
                    ))}
                  </div>

                  {makeWhat === 'single' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2" role="radiogroup" aria-label="Choose a game">
                      {ACTIVITY_FORMATS.map((fmt) => {
                        const meta = FORMAT_META[fmt];
                        const isSelected = format === fmt;
                        return (
                          <button
                            key={fmt}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => setFormat(fmt)}
                            className={`flex flex-col items-start rounded-xl border-2 p-3 text-left transition-colors ${
                              isSelected ? 'border-blue-600 bg-blue-50/70' : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <span className="text-base font-semibold text-slate-950">{meta.shortLabel}</span>
                            <span className="mt-0.5 text-sm text-slate-600 leading-snug">{meta.summary}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Support */}
                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-900">Help for my class</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {DIFFERENTIATION_TIERS.map((tier) => (
                      <label
                        key={tier}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${
                          differentiation === tier ? 'border-blue-600 bg-blue-50/60' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="support"
                          checked={differentiation === tier}
                          onChange={() => setDifferentiation(tier)}
                          className="mt-1 h-4 w-4"
                        />
                        <span>
                          <span className="block text-base font-semibold text-slate-950">{TIER_LABELS[tier].label}</span>
                          <span className="block text-sm text-slate-600">{TIER_LABELS[tier].help}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Count */}
                <div className="space-y-2">
                  <label htmlFor="question-count-select" className="block text-base font-semibold text-slate-900">
                    How many questions in each game?
                  </label>
                  <select
                    id="question-count-select"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value ? Number(e.target.value) : '')}
                    className="rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">Let it decide (usually 6 to 8)</option>
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={12}>12</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          {/* Main button */}
          <div className="space-y-2 border-t border-slate-200 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl bg-blue-700 px-8 py-4 text-lg font-semibold text-white hover:bg-blue-800 disabled:opacity-70 transition-colors min-h-[60px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Making your lesson… (about 30 seconds)
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  {generatePack ? 'Make my lesson' : `Make one ${FORMAT_META[format].shortLabel.toLowerCase()} game`}
                </>
              )}
            </button>
            <p className="text-sm text-slate-600">
              {generatePack
                ? packPreview
                  ? `You'll get 3 games that suit ${exactYear}: a ${packPreview[0]} to start, ${packPreview[1]} for the main part, and ${packPreview[2]} to finish.`
                  : "You'll get 3 games: one to start the lesson, one for the main part, and one to finish."
                : 'You will get one game.'}{' '}
              You can check and change every question before pupils see anything.
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-base font-medium text-red-900">
              {error}
            </div>
          )}

        </fieldset>
      </form>
    </div>
  );
}

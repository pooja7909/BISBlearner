export const YEAR_GROUPS = [
  'EYFS (Ages 4-5)',
  'Year 1-2 (KS1)',
  'Year 3-4 (Lower KS2)',
  'Year 5-6 (Upper KS2)',
  'Year 7-9 (KS3)',
  'Year 10-11 (GCSE)',
  'Year 12-13 (Sixth Form)',
] as const;

export type YearGroup = (typeof YEAR_GROUPS)[number];

export const DEFAULT_SUBJECTS = [
  'Science',
  'Mathematics',
  'English',
  'History',
  'Geography',
  'Computing',
  'French',
  'Spanish',
  'German',
  'Hungarian',
  'Russian',
  'Languages',
  'Arts & Design',
  'PSHE',
] as const;

export type SubjectArea = string;

export const ACTIVITY_FORMATS = [
  'sort',
  'sequence',
  'match',
  'quiz',
  'cloze',
  'bingo',
  'draw',
  'wordcloud',
  'buzzer',
  'escape',
] as const;

export type ActivityFormat = (typeof ACTIVITY_FORMATS)[number];

export const DIFFERENTIATION_TIERS = [
  'All Learners',
  'Visual & EAL Support',
  'Stretch & Challenge',
] as const;

export type DifferentiationTier = (typeof DIFFERENTIATION_TIERS)[number];

export type PlayMode = 'individual' | 'group';

export interface SortBucket {
  id: string;
  label: string;
  description: string;
}

export interface SortItem {
  id: string;
  text: string;
  bucketId: string;
  reason: string;
}

export interface SortPayload {
  type: 'sort';
  instructions: string;
  buckets: SortBucket[];
  items: SortItem[];
}

export interface SequenceStep {
  id: string;
  order: number;
  label: string;
  detail: string;
  clue: string;
}

export interface SequencePayload {
  type: 'sequence';
  instructions: string;
  steps: SequenceStep[];
}

export interface MatchPair {
  id: string;
  left: string;
  right: string;
  connectionNote: string;
}

export interface MatchPayload {
  type: 'match';
  instructions: string;
  leftHeading: string;
  rightHeading: string;
  pairs: MatchPair[];
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
  discussionPrompt: string;
  tier: 'Support' | 'Core' | 'Stretch';
}

export interface QuizPayload {
  type: 'quiz';
  instructions: string;
  questions: QuizQuestion[];
}

export interface ClozeSegment {
  text?: string;
  blankId?: string;
  answer?: string;
  clue?: string;
}

export interface ClozePayload {
  type: 'cloze';
  instructions: string;
  segments: ClozeSegment[];
  distractors: string[];
}

export interface BingoEntry {
  id: string;
  term: string;
  clue: string;
}

export interface BingoPayload {
  type: 'bingo';
  instructions: string;
  entries: BingoEntry[];
}

export interface DrawPayload {
  type: 'draw';
  instructions: string;
  prompt: string;
  checklist: string[];
  labelChips: string[];
}

export interface WordCloudPayload {
  type: 'wordcloud';
  instructions: string;
  prompt: string;
  seedWords: string[];
  followUpQuestion: string;
}

export interface BuzzerQuestion {
  id: string;
  points: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface BuzzerCategory {
  name: string;
  questions: BuzzerQuestion[];
}

export interface BuzzerPayload {
  type: 'buzzer';
  instructions: string;
  categories: BuzzerCategory[];
}

export interface EscapeStage {
  id: string;
  stageTitle: string;
  riddle: string;
  options: string[];
  correctIndex: number;
  codeDigit: string;
  hint: string;
  explanation: string;
}

export interface EscapePayload {
  type: 'escape';
  instructions: string;
  storyIntro: string;
  stages: EscapeStage[];
}

export type ActivityPayload =
  | SortPayload
  | SequencePayload
  | MatchPayload
  | QuizPayload
  | ClozePayload
  | BingoPayload
  | DrawPayload
  | WordCloudPayload
  | BuzzerPayload
  | EscapePayload;

export interface ClassroomActivity {
  id: string;
  title: string;
  topic: string;
  yearGroup: YearGroup;
  subject: SubjectArea;
  objectives: string[];
  format: ActivityFormat;
  differentiation: DifferentiationTier;
  estimatedMinutes: number;
  teacherTip: string;
  inclusionNote: string;
  createdAt: string;
  isStarter?: boolean;
  sourceFileName?: string;
  /** Single year the teacher chose, e.g. "Year 4". yearGroup stays the wider band. */
  exactYear?: string;
  /** Server-only: random key of the browser that made it. Never sent to other browsers. */
  ownerKey?: string;
  /** Sent by the server: true when this browser made the lesson (or is an admin). */
  mine?: boolean;
  payload: ActivityPayload;
}

/** Single year groups teachers actually think in, mapped to the bands the AI and starters use. */
export const EXACT_YEARS: { label: string; band: YearGroup; age: string }[] = [
  { label: 'Reception', band: 'EYFS (Ages 4-5)', age: '4–5' },
  { label: 'Year 1', band: 'Year 1-2 (KS1)', age: '5–6' },
  { label: 'Year 2', band: 'Year 1-2 (KS1)', age: '6–7' },
  { label: 'Year 3', band: 'Year 3-4 (Lower KS2)', age: '7–8' },
  { label: 'Year 4', band: 'Year 3-4 (Lower KS2)', age: '8–9' },
  { label: 'Year 5', band: 'Year 5-6 (Upper KS2)', age: '9–10' },
  { label: 'Year 6', band: 'Year 5-6 (Upper KS2)', age: '10–11' },
  { label: 'Year 7', band: 'Year 7-9 (KS3)', age: '11–12' },
  { label: 'Year 8', band: 'Year 7-9 (KS3)', age: '12–13' },
  { label: 'Year 9', band: 'Year 7-9 (KS3)', age: '13–14' },
  { label: 'Year 10', band: 'Year 10-11 (GCSE)', age: '14–15' },
  { label: 'Year 11', band: 'Year 10-11 (GCSE)', age: '15–16' },
  { label: 'Year 12', band: 'Year 12-13 (Sixth Form)', age: '16–17' },
  { label: 'Year 13', band: 'Year 12-13 (Sixth Form)', age: '17–18' },
];

export function bandForYear(label: string): YearGroup {
  return EXACT_YEARS.find((y) => y.label === label)?.band ?? 'Year 7-9 (KS3)';
}

/** Short, friendly year text for cards and headers. */
export function yearLabel(activity: Pick<ClassroomActivity, 'yearGroup' | 'exactYear'>): string {
  if (activity.exactYear) return activity.exactYear;
  const map: Record<string, string> = {
    'EYFS (Ages 4-5)': 'Reception',
    'Year 1-2 (KS1)': 'Years 1–2',
    'Year 3-4 (Lower KS2)': 'Years 3–4',
    'Year 5-6 (Upper KS2)': 'Years 5–6',
    'Year 7-9 (KS3)': 'Years 7–9',
    'Year 10-11 (GCSE)': 'Years 10–11',
    'Year 12-13 (Sixth Form)': 'Years 12–13',
  };
  return map[activity.yearGroup] ?? activity.yearGroup;
}

/** Starter, main and plenary games that suit each age band. Used by "Make my lesson". */
export function packFormatsFor(band: YearGroup): ActivityFormat[] {
  switch (band) {
    case 'EYFS (Ages 4-5)':
    case 'Year 1-2 (KS1)':
      return ['match', 'sort', 'bingo'];
    case 'Year 3-4 (Lower KS2)':
      return ['quiz', 'sort', 'bingo'];
    case 'Year 5-6 (Upper KS2)':
      return ['quiz', 'sort', 'buzzer'];
    case 'Year 7-9 (KS3)':
      return ['quiz', 'sort', 'buzzer'];
    default:
      return ['quiz', 'match', 'escape'];
  }
}

/** Plain-English names for the stored differentiation values. */
export const TIER_LABELS: Record<DifferentiationTier, { label: string; help: string }> = {
  'All Learners': { label: 'Everyone', help: 'A mix of easier and harder questions' },
  'Visual & EAL Support': {
    label: 'Extra support',
    help: 'Simpler words and clear clues. Good for EAL and SEND',
  },
  'Stretch & Challenge': { label: 'Extra challenge', help: 'Harder questions that need reasoning' },
};

/** Voice language for read-aloud. Language lessons use that language; everything else British English. */
export function speechLangForSubject(subject: string): string {
  const s = subject.toLowerCase();
  const table: [string, string][] = [
    ['french', 'fr-FR'], ['spanish', 'es-ES'], ['german', 'de-DE'], ['hungarian', 'hu-HU'],
    ['russian', 'ru-RU'], ['italian', 'it-IT'], ['polish', 'pl-PL'], ['portuguese', 'pt-PT'],
    ['dutch', 'nl-NL'], ['mandarin', 'zh-CN'], ['chinese', 'zh-CN'], ['japanese', 'ja-JP'],
    ['arabic', 'ar-SA'], ['turkish', 'tr-TR'], ['greek', 'el-GR'], ['czech', 'cs-CZ'],
    ['romanian', 'ro-RO'], ['ukrainian', 'uk-UA'], ['korean', 'ko-KR'], ['welsh', 'cy-GB'],
  ];
  for (const [word, lang] of table) if (s.includes(word)) return lang;
  return 'en-GB';
}

export const STUDENT_CHARACTERS = [
  { id: 'fox', label: 'Clever Fox' },
  { id: 'owl', label: 'Wise Owl' },
  { id: 'bot', label: 'Spark Bot' },
  { id: 'astro', label: 'Astro' },
  { id: 'bear', label: 'Polar Bear' },
  { id: 'cat', label: 'Study Cat' },
  { id: 'dino', label: 'Rex' },
  { id: 'comet', label: 'Comet' },
] as const;

export type StudentCharacterId = (typeof STUDENT_CHARACTERS)[number]['id'];

export interface RoomParticipant {
  id: string;
  name: string;
  team: string;
  character?: string;
  score: number;
  total: number;
  completed: boolean;
  summary: string;
  updatedAt: string;
}

export interface WordSubmission {
  id: string;
  word: string;
  author: string;
  team: string;
  pinned?: boolean;
}

export interface DrawingSubmission {
  id: string;
  author: string;
  team: string;
  imageDataUrl: string;
  submittedAt: string;
}

export interface LiveRoom {
  code: string;
  activityId: string;
  createdAt: string;
  playMode: PlayMode;
  paused: boolean;
  bingoCalledIds: string[];
  spotlightDrawingId: string | null;
  participants: RoomParticipant[];
  wordSubmissions: WordSubmission[];
  drawingSubmissions: DrawingSubmission[];
}

export interface TeamScore {
  name: string;
  points: number;
}

export const FORMAT_META: Record<
  ActivityFormat,
  { label: string; shortLabel: string; summary: string }
> = {
  sort: {
    label: 'Sort into groups',
    shortLabel: 'Sort into groups',
    summary: 'Pupils put each card into the right group',
  },
  sequence: {
    label: 'Put in order',
    shortLabel: 'Put in order',
    summary: 'Pupils put steps or events in the right order',
  },
  match: {
    label: 'Match the pairs',
    shortLabel: 'Match pairs',
    summary: 'Pupils join each word to its meaning',
  },
  quiz: {
    label: 'Quiz',
    shortLabel: 'Quiz',
    summary: 'Multiple-choice questions with hints',
  },
  cloze: {
    label: 'Fill the gaps',
    shortLabel: 'Fill the gaps',
    summary: 'Pupils choose words to finish sentences',
  },
  bingo: {
    label: 'Bingo',
    shortLabel: 'Bingo',
    summary: 'You read a clue, pupils find the answer on their card',
  },
  draw: {
    label: 'Draw and label',
    shortLabel: 'Draw and label',
    summary: 'Pupils draw a diagram and add labels',
  },
  wordcloud: {
    label: 'Word cloud',
    shortLabel: 'Word cloud',
    summary: 'Pupils send in words; popular words grow bigger (needs pupil devices)',
  },
  buzzer: {
    label: 'Team points quiz',
    shortLabel: 'Team points quiz',
    summary: 'Teams pick a topic and a points value, then answer',
  },
  escape: {
    label: 'Codebreaker',
    shortLabel: 'Codebreaker',
    summary: 'Solve 4 puzzles in a row to unlock a secret code',
  },
};

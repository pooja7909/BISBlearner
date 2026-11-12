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
  payload: ActivityPayload;
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
    label: 'Category Sort & Classify',
    shortLabel: 'Sort',
    summary: 'Group concepts into clear buckets with instant misconception coaching',
  },
  sequence: {
    label: 'Sequence & Timeline Builder',
    shortLabel: 'Sequence',
    summary: 'Order steps, processes, or historical events into logical flow',
  },
  match: {
    label: 'Match & Connect Pairs',
    shortLabel: 'Match',
    summary: 'Link terms, examples, formulas, or translations on a tactile board',
  },
  quiz: {
    label: 'Concept Quiz & Class Debate',
    shortLabel: 'Quiz',
    summary: 'Interactive checks with 50/50 hints and whole-class talk prompts',
  },
  cloze: {
    label: 'Word & Concept Builder',
    shortLabel: 'Word Builder',
    summary: 'Complete living curriculum passages using an interactive word bank',
  },
  bingo: {
    label: 'Classroom Concept Bingo',
    shortLabel: 'Bingo',
    summary: 'Match clues called by the teacher onto randomized 3×3 concept cards',
  },
  draw: {
    label: 'Draw & Label Sketch Studio',
    shortLabel: 'Draw & Label',
    summary: 'Sketch diagrams with colour tools and label chips, then share to the board',
  },
  wordcloud: {
    label: 'Live Word Cloud Brainstorm',
    shortLabel: 'Word Cloud',
    summary: 'Collect class ideas in real time and scale key vocabulary dynamically',
  },
  buzzer: {
    label: 'Team Duel Challenge Grid',
    shortLabel: 'Team Duel',
    summary: 'Jeopardy-style 100–300 pt category grid built for KS3/KS4 group play',
  },
  escape: {
    label: 'Mystery Codebreaker Escape',
    shortLabel: 'Codebreaker',
    summary: 'Crack 4 curriculum riddles in sequence to unlock the vault code',
  },
};

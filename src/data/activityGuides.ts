import type { ActivityFormat } from '../types.ts';

export interface ActivityGuideStep {
  title: string;
  detail: string;
}

export interface ActivityFormatGuide {
  summary: string;
  teacherSteps: ActivityGuideStep[];
  studentSteps: ActivityGuideStep[];
}

export const ACTIVITY_GUIDES: Record<ActivityFormat, ActivityFormatGuide> = {
  sort: {
    summary:
      'Pupils put each card into the right group, then you talk about the tricky ones.',
    teacherSteps: [
      {
        title: 'Preview & Set the Timer',
        detail: 'Check the buckets and cards below, then set a 2–5 minute Activity Timer on the right.',
      },
      {
        title: 'Model the First Card',
        detail: 'Read the first card aloud on Board Mode and ask pairs to justify which bucket it fits.',
      },
      {
        title: 'Debrief Tricky Cards',
        detail: 'Use "Skip Card" if a card stalls discussion, or review the explanation reasons together at the end.',
      },
    ],
    studentSteps: [
      {
        title: 'Pick an Active Card',
        detail: 'Select any card from the tray at the top (or use Read Card to hear it aloud).',
      },
      {
        title: 'Choose the Matching Bucket',
        detail: 'Click "Place here" under the category bucket that best fits the card.',
      },
      {
        title: 'Read Feedback or Skip if Needed',
        detail: 'If a card goes amber, read the clue and try again — or click "Skip Card" to move on.',
      },
      {
        title: 'Review Completed Groups',
        detail: 'Check all placed cards and explain why each belongs in its category.',
      },
    ],
  },
  sequence: {
    summary:
      'Pupils put the steps in the right order, then check them together.',
    teacherSteps: [
      {
        title: 'Display Shuffled Cards',
        detail: 'Start in Board Mode or share a Live Room Code so teams debate the first and final steps.',
      },
      {
        title: 'Toggle Clues for Support',
        detail: 'Click "Show Clues" if learners need scaffolding to spot chronological or cause-and-effect links.',
      },
      {
        title: 'Check Order Together',
        detail: 'Press "Check Order" once the class agrees — green cards are locked in place, amber cards need swapping.',
      },
    ],
    studentSteps: [
      {
        title: 'Read All Cards First',
        detail: 'Scan every step card to find what must happen first and last.',
      },
      {
        title: 'Reorder Using Arrows or Tap-to-Swap',
        detail: 'Use the up/down arrows or tap two cards to swap their positions.',
      },
      {
        title: 'Use Clues if Stuck',
        detail: 'Click "Show Clues" for extra hints, then press "Check Order" to test your sequence.',
      },
      {
        title: 'Refine Until Complete',
        detail: 'Adjust any amber cards until every step turns green.',
      },
    ],
  },
  match: {
    summary:
      'Pupils join each word to its meaning or partner.',
    teacherSteps: [
      {
        title: 'Introduce Both Columns',
        detail: 'Point out the left and right column headings so students know what kind of link to look for.',
      },
      {
        title: 'Encourage Pair Talk',
        detail: 'Have students explain the connection out loud before clicking the right-hand card.',
      },
      {
        title: 'Use Reveal or Skip',
        detail: 'Click "Reveal 1 Pair" (or let students skip a tricky pair) to keep momentum high.',
      },
    ],
    studentSteps: [
      {
        title: 'Select a Left-Column Card',
        detail: 'Tap any card in Column 1 to highlight it as your starting item.',
      },
      {
        title: 'Tap Its Match in Column 2',
        detail: 'Click the matching card in Column 2 to test the connection.',
      },
      {
        title: 'Read the Connection Note',
        detail: 'Verified pairs move below with a brief explanation; click "Skip Pair" if you get stuck.',
      },
      {
        title: 'Clear the Whole Board',
        detail: 'Match all pairs to complete the round.',
      },
    ],
  },
  quiz: {
    summary:
      'Read each question, let pupils choose an answer, then reveal it and discuss.',
    teacherSteps: [
      {
        title: 'Run One Question at a Time',
        detail: 'Give 20 seconds of silent thinking time before taking votes or team answers.',
      },
      {
        title: 'Use 50/50 + Hint or Skip',
        detail: 'Eliminate two distractors if needed, or click "Skip Question" to jump straight to the next check.',
      },
      {
        title: 'Facilitate the Talk Prompt',
        detail: 'After revealing the answer, use the Class Talk Prompt and award +1 Team Point.',
      },
    ],
    studentSteps: [
      {
        title: 'Read Question & Options',
        detail: 'Read carefully (or tap "Read Question" to listen aloud).',
      },
      {
        title: 'Use Hint or Skip if Needed',
        detail: 'Tap "50/50 + Hint" to narrow down options, or "Skip Question" to move on.',
      },
      {
        title: 'Lock In Your Choice',
        detail: 'Select A, B, C, or D to see instant feedback and why the answer works.',
      },
      {
        title: 'Advance to Next Question',
        detail: 'Click "Next Question" until you reach your final score summary.',
      },
    ],
  },
  cloze: {
    summary:
      'Pupils pick words from the box to fill each gap in the text.',
    teacherSteps: [
      {
        title: 'Read the Full Passage Aloud',
        detail: 'Click "Read Passage" first so learners hear the context before choosing words.',
      },
      {
        title: 'Toggle Vocabulary Clues',
        detail: 'Use "Show Clues" to support EAL/developing readers while keeping distractor words in the bank.',
      },
      {
        title: 'Check & Discuss',
        detail: 'Click "Check Passage" to highlight accurate placements and spot why distractors do not fit.',
      },
    ],
    studentSteps: [
      {
        title: 'Select a Blank Space',
        detail: 'Tap any dashed blank inside the passage to highlight it.',
      },
      {
        title: 'Pick a Word from the Bank',
        detail: 'Tap a vocabulary word below to place it into the active blank (watch out for distractors!).',
      },
      {
        title: 'Swap Anytime',
        detail: 'Tap a filled word in the passage to return it to the word bank.',
      },
      {
        title: 'Check Passage',
        detail: 'Press "Check Passage" to verify your answers and fix any amber words.',
      },
    ],
  },
  bingo: {
    summary:
      'You read out a clue; pupils find and mark the answer on their card.',
    teacherSteps: [
      {
        title: 'Launch a Live Room or Play on Board',
        detail: 'Students joining via Room Code each get a randomized 3×3 card synced to your clues.',
      },
      {
        title: 'Draw or Skip Clues',
        detail: 'Press "Draw Next Clue" to reveal and read a clue aloud — or "Skip Clue" to draw a different one.',
      },
      {
        title: 'Celebrate Line & Full House',
        detail: 'Trigger Fanfare or Applause from the Audio deck when the first Line or Full House is called!',
      },
    ],
    studentSteps: [
      {
        title: 'Check Your 3×3 Card',
        detail: 'Scan the 9 concept terms on your grid before the first clue is drawn.',
      },
      {
        title: 'Listen to the Teacher Clue',
        detail: 'Read the Current Clue banner (or tap Read Clue) when your teacher draws a clue.',
      },
      {
        title: 'Tap the Matching Square',
        detail: 'Select the term that matches the clue to mark it green.',
      },
      {
        title: 'Call Line or Full House',
        detail: 'Complete 3 in a row (across, down, or diagonal) for Line Bingo, then aim for all 9!',
      },
    ],
  },
  draw: {
    summary:
      'Pupils draw a diagram and add labels, then share the best ones on the board.',
    teacherSteps: [
      {
        title: 'Brief the Checklist',
        detail: 'Review the visual prompt and checklist items so students know what their diagram must show.',
      },
      {
        title: 'Collect Live Submissions',
        detail: 'In a Live Room, student sketches appear automatically in the Gallery.',
      },
      {
        title: 'Spotlight Great Examples',
        detail: 'Click any submitted sketch to spotlight it on the main board for class critique.',
      },
    ],
    studentSteps: [
      {
        title: 'Read the Prompt & Checklist',
        detail: 'Check what features your drawing should include before sketching.',
      },
      {
        title: 'Sketch on the Canvas',
        detail: 'Choose pen colours and brush sizes to draw your diagram clearly.',
      },
      {
        title: 'Stamp Vocabulary Labels',
        detail: 'Select a label chip, then tap where you want to place that label on your drawing.',
      },
      {
        title: 'Submit to Class Gallery',
        detail: 'Click "Submit Drawing" to share your work with the teacher and board.',
      },
    ],
  },
  wordcloud: {
    summary:
      'Pupils send in words on their devices; words sent more often grow bigger.',
    teacherSteps: [
      {
        title: 'Review Starter Words',
        detail: 'Use the seed words already in the cloud to model concise 1–2 word responses.',
      },
      {
        title: 'Pause or Moderate Anytime',
        detail: 'Pin standout words, delete off-topic entries, or pause student submissions for a midpoint check.',
      },
      {
        title: 'Ask the Follow-Up Challenge',
        detail: 'Use the largest words in the finished cloud to lead the final discussion question.',
      },
    ],
    studentSteps: [
      {
        title: 'Read the Brainstorm Prompt',
        detail: 'Think of 1–2 word ideas, examples, or key terms connected to the prompt.',
      },
      {
        title: 'Submit Your Words',
        detail: 'Type your response and press Submit to watch it appear in the live cloud.',
      },
      {
        title: 'Spot Patterns',
        detail: 'Notice which words grow biggest as classmates submit matching ideas.',
      },
      {
        title: 'Join the Follow-Up Talk',
        detail: 'Be ready to explain one highlighted word from the cloud.',
      },
    ],
  },
  buzzer: {
    summary:
      'Teams take turns to pick a topic and a points value, then answer for points.',
    teacherSteps: [
      {
        title: 'Pick Question Timer & Teams',
        detail: 'Set 15s–90s (or Untimed) at the top and highlight the active team in the Scoreboard.',
      },
      {
        title: 'Let Teams Choose Tiles',
        detail: 'Teams pick a category and point value (100, 200, or 300) to open the timed challenge.',
      },
      {
        title: 'Adjust Timer, Skip, or Award Points',
        detail: 'Use -5s / +10s mid-question, "Skip Tile" to pass without scoring, or award points straight to the team.',
      },
    ],
    studentSteps: [
      {
        title: 'Select a Category & Point Tile',
        detail: 'Choose an open 100, 200, or 300 point tile on the board.',
      },
      {
        title: 'Beat the Countdown',
        detail: 'Discuss quickly and pick the best answer before the timer hits zero.',
      },
      {
        title: 'Skip if Needed',
        detail: 'Use "Skip Tile" to return to the grid if your teacher wants to pass on a tile.',
      },
      {
        title: 'Clear the Board',
        detail: 'Work through every category tile to tally the final team score.',
      },
    ],
  },
  escape: {
    summary:
      'Pupils solve 4 puzzles in a row; each answer gives one part of a secret code.',
    teacherSteps: [
      {
        title: 'Set the Scene',
        detail: 'Read the Story Intro aloud to frame the 4-stage mystery codebreaker.',
      },
      {
        title: 'Guide Locked Teams',
        detail: 'Encourage students to check the Hint button before guessing, or use "Skip Lock" if a group is blocked.',
      },
      {
        title: 'Celebrate the Vault Code',
        detail: 'Play the Fanfare sound effect as teams crack the final combination!',
      },
    ],
    studentSteps: [
      {
        title: 'Read the Current Lock Riddle',
        detail: 'Study the puzzle clue carefully (or tap Read Riddle to listen).',
      },
      {
        title: 'Use Hint or Skip Lock if Stuck',
        detail: 'Tap Hint for a clue, or "Skip Lock" to advance past a tricky stage if needed.',
      },
      {
        title: 'Unlock Each Vault Digit',
        detail: 'Choose the right answer to reveal the digit and move to the next lock.',
      },
      {
        title: 'Crack the Full Combination',
        detail: 'Collect all vault digits in sequence to open the vault.',
      },
    ],
  },
};

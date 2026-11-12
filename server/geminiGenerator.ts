import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import JSZip from 'jszip';
import crypto from 'node:crypto';
import type {
  ActivityFormat,
  ActivityPayload,
  BingoPayload,
  BuzzerPayload,
  ClassroomActivity,
  ClozePayload,
  DifferentiationTier,
  DrawPayload,
  EscapePayload,
  MatchPayload,
  QuizPayload,
  SequencePayload,
  SortPayload,
  SubjectArea,
  WordCloudPayload,
  YearGroup,
} from '../src/types.ts';

let cachedClient: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

export interface GenerateActivityRequest {
  topic: string;
  yearGroup: YearGroup;
  subject: SubjectArea;
  objectives: string[];
  format: ActivityFormat;
  differentiation: DifferentiationTier;
  questionCount?: number;
}

export interface GenerateFromFileRequest {
  fileName: string;
  mimeType: string;
  base64Data: string;
  topic?: string;
  yearGroup: YearGroup;
  subject: SubjectArea;
  objectives?: string[];
  format: ActivityFormat;
  differentiation: DifferentiationTier;
  generatePack?: boolean;
  questionCount?: number;
}

function getSchemaForFormat(format: ActivityFormat) {
  const baseProperties = {
    title: {
      type: Type.STRING,
      description: 'Engaging, student-friendly activity title (max 8 words).',
    },
    inferredTopic: {
      type: Type.STRING,
      description: 'Concise topic name summarized from the lesson content.',
    },
    inferredObjectives: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '2 clear lesson objectives aligned to the activity.',
    },
    estimatedMinutes: {
      type: Type.INTEGER,
      description: 'Realistic classroom duration in minutes (between 5 and 20).',
    },
    teacherTip: {
      type: Type.STRING,
      description:
        'Practical facilitation tip for running this live with students (e.g., Turn & Talk, team points, timer).',
    },
    inclusionNote: {
      type: Type.STRING,
      description:
        'Concrete inclusion or scaffolding advice so every learner, including EAL/SEND and rapid-graspers, thrives.',
    },
  };

  if (format === 'sort') {
    return {
      type: Type.OBJECT,
      properties: {
        ...baseProperties,
        instructions: { type: Type.STRING },
        buckets: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['id', 'label', 'description'],
          },
        },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              bucketId: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ['id', 'text', 'bucketId', 'reason'],
          },
        },
      },
      required: [
        'title',
        'estimatedMinutes',
        'teacherTip',
        'inclusionNote',
        'instructions',
        'buckets',
        'items',
      ],
    };
  }

  if (format === 'sequence') {
    return {
      type: Type.OBJECT,
      properties: {
        ...baseProperties,
        instructions: { type: Type.STRING },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              order: { type: Type.INTEGER },
              label: { type: Type.STRING },
              detail: { type: Type.STRING },
              clue: { type: Type.STRING },
            },
            required: ['id', 'order', 'label', 'detail', 'clue'],
          },
        },
      },
      required: [
        'title',
        'estimatedMinutes',
        'teacherTip',
        'inclusionNote',
        'instructions',
        'steps',
      ],
    };
  }

  if (format === 'match') {
    return {
      type: Type.OBJECT,
      properties: {
        ...baseProperties,
        instructions: { type: Type.STRING },
        leftHeading: { type: Type.STRING },
        rightHeading: { type: Type.STRING },
        pairs: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              left: { type: Type.STRING },
              right: { type: Type.STRING },
              connectionNote: { type: Type.STRING },
            },
            required: ['id', 'left', 'right', 'connectionNote'],
          },
        },
      },
      required: [
        'title',
        'estimatedMinutes',
        'teacherTip',
        'inclusionNote',
        'instructions',
        'leftHeading',
        'rightHeading',
        'pairs',
      ],
    };
  }

  if (format === 'cloze') {
    return {
      type: Type.OBJECT,
      properties: {
        ...baseProperties,
        instructions: { type: Type.STRING },
        segments: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              blankId: { type: Type.STRING },
              answer: { type: Type.STRING },
              clue: { type: Type.STRING },
            },
          },
        },
        distractors: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        'title',
        'estimatedMinutes',
        'teacherTip',
        'inclusionNote',
        'instructions',
        'segments',
        'distractors',
      ],
    };
  }

  if (format === 'bingo') {
    return {
      type: Type.OBJECT,
      properties: {
        ...baseProperties,
        instructions: { type: Type.STRING },
        entries: {
          type: Type.ARRAY,
          description: '10 to 12 concise key terms with crisp spoken clues for classroom Bingo.',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              term: {
                type: Type.STRING,
                description: 'Short term or concept that fits on a Bingo square (1-4 words).',
              },
              clue: {
                type: Type.STRING,
                description: '1-sentence clue the teacher calls out without naming the exact term.',
              },
            },
            required: ['id', 'term', 'clue'],
          },
        },
      },
      required: [
        'title',
        'estimatedMinutes',
        'teacherTip',
        'inclusionNote',
        'instructions',
        'entries',
      ],
    };
  }

  if (format === 'draw') {
    return {
      type: Type.OBJECT,
      properties: {
        ...baseProperties,
        instructions: { type: Type.STRING },
        prompt: {
          type: Type.STRING,
          description: 'Clear visual drawing challenge tied to the lesson objective.',
        },
        checklist: {
          type: Type.ARRAY,
          description: '4 to 5 visual features students should include in their drawing.',
          items: { type: Type.STRING },
        },
        labelChips: {
          type: Type.ARRAY,
          description: '5 to 7 concise key vocabulary labels students can stamp onto their sketch.',
          items: { type: Type.STRING },
        },
      },
      required: [
        'title',
        'estimatedMinutes',
        'teacherTip',
        'inclusionNote',
        'instructions',
        'prompt',
        'checklist',
        'labelChips',
      ],
    };
  }

  if (format === 'wordcloud') {
    return {
      type: Type.OBJECT,
      properties: {
        ...baseProperties,
        instructions: { type: Type.STRING },
        prompt: {
          type: Type.STRING,
          description: 'Open-ended prompt inviting short 1-2 word student contributions.',
        },
        seedWords: {
          type: Type.ARRAY,
          description: '5 or 6 starter vocabulary words to model quality contributions.',
          items: { type: Type.STRING },
        },
        followUpQuestion: {
          type: Type.STRING,
          description: 'Class discussion challenge using words from the finished cloud.',
        },
      },
      required: [
        'title',
        'estimatedMinutes',
        'teacherTip',
        'inclusionNote',
        'instructions',
        'prompt',
        'seedWords',
        'followUpQuestion',
      ],
    };
  }

  if (format === 'buzzer') {
    return {
      type: Type.OBJECT,
      properties: {
        ...baseProperties,
        instructions: { type: Type.STRING },
        categories: {
          type: Type.ARRAY,
          description: 'Exactly 3 sub-topic categories, each containing 3 questions worth 100, 200, and 300 points.',
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    points: { type: Type.INTEGER },
                    prompt: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                  },
                  required: ['id', 'points', 'prompt', 'options', 'correctIndex', 'explanation'],
                },
              },
            },
            required: ['name', 'questions'],
          },
        },
      },
      required: [
        'title',
        'estimatedMinutes',
        'teacherTip',
        'inclusionNote',
        'instructions',
        'categories',
      ],
    };
  }

  if (format === 'escape') {
    return {
      type: Type.OBJECT,
      properties: {
        ...baseProperties,
        instructions: { type: Type.STRING },
        storyIntro: {
          type: Type.STRING,
          description: 'Short, exciting 2-sentence scenario setting up the 4-lock codebreaker.',
        },
        stages: {
          type: Type.ARRAY,
          description: '4 sequential puzzle stages, each revealing a single digit or letter codeDigit.',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              stageTitle: { type: Type.STRING },
              riddle: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              codeDigit: {
                type: Type.STRING,
                description: 'Single digit or character (e.g., "4", "7", "B").',
              },
              hint: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: [
              'id',
              'stageTitle',
              'riddle',
              'options',
              'correctIndex',
              'codeDigit',
              'hint',
              'explanation',
            ],
          },
        },
      },
      required: [
        'title',
        'estimatedMinutes',
        'teacherTip',
        'inclusionNote',
        'instructions',
        'storyIntro',
        'stages',
      ],
    };
  }

  // Default: quiz
  return {
    type: Type.OBJECT,
    properties: {
      ...baseProperties,
      instructions: { type: Type.STRING },
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            prompt: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            hint: { type: Type.STRING },
            explanation: { type: Type.STRING },
            discussionPrompt: { type: Type.STRING },
            tier: { type: Type.STRING },
          },
          required: [
            'id',
            'prompt',
            'options',
            'correctIndex',
            'hint',
            'explanation',
            'discussionPrompt',
            'tier',
          ],
        },
      },
    },
    required: [
      'title',
      'estimatedMinutes',
      'teacherTip',
      'inclusionNote',
      'instructions',
      'questions',
    ],
  };
}

function normalizePayload(format: ActivityFormat, raw: Record<string, unknown>): ActivityPayload {
  if (format === 'sort') {
    const rawBuckets = Array.isArray(raw.buckets) ? raw.buckets : [];
    const buckets = rawBuckets.slice(0, 3).map((b: Record<string, unknown>, idx: number) => ({
      id: String(b.id || `bucket-${idx + 1}`),
      label: String(b.label || `Group ${idx + 1}`),
      description: String(b.description || ''),
    }));
    const validBucketIds = new Set(buckets.map((b) => b.id));
    const fallbackBucketId = buckets[0]?.id ?? 'bucket-1';
    const rawItems = Array.isArray(raw.items) ? raw.items : [];
    const items = rawItems.map((item: Record<string, unknown>, idx: number) => ({
      id: String(item.id || `item-${idx + 1}`),
      text: String(item.text || `Item ${idx + 1}`),
      bucketId: validBucketIds.has(String(item.bucketId))
        ? String(item.bucketId)
        : fallbackBucketId,
      reason: String(item.reason || 'Review the category definition to check this match.'),
    }));
    return {
      type: 'sort',
      instructions: String(
        raw.instructions || 'Select each item card, then place it into the matching group.'
      ),
      buckets,
      items,
    } satisfies SortPayload;
  }

  if (format === 'sequence') {
    const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
    const steps = rawSteps.map((s: Record<string, unknown>, idx: number) => ({
      id: String(s.id || `step-${idx + 1}`),
      order: typeof s.order === 'number' ? s.order : idx + 1,
      label: String(s.label || `Step ${idx + 1}`),
      detail: String(s.detail || ''),
      clue: String(s.clue || ''),
    }));
    steps.sort((a, b) => a.order - b.order);
    steps.forEach((s, idx) => {
      s.order = idx + 1;
    });
    return {
      type: 'sequence',
      instructions: String(raw.instructions || 'Arrange the steps in the correct logical order.'),
      steps,
    } satisfies SequencePayload;
  }

  if (format === 'match') {
    const rawPairs = Array.isArray(raw.pairs) ? raw.pairs : [];
    const pairs = rawPairs.map((p: Record<string, unknown>, idx: number) => ({
      id: String(p.id || `pair-${idx + 1}`),
      left: String(p.left || `Prompt ${idx + 1}`),
      right: String(p.right || `Match ${idx + 1}`),
      connectionNote: String(p.connectionNote || ''),
    }));
    return {
      type: 'match',
      instructions: String(raw.instructions || 'Select one item from each column to form a pair.'),
      leftHeading: String(raw.leftHeading || 'Concept'),
      rightHeading: String(raw.rightHeading || 'Connection'),
      pairs,
    } satisfies MatchPayload;
  }

  if (format === 'cloze') {
    const rawSegments = Array.isArray(raw.segments) ? raw.segments : [];
    let blankCounter = 1;
    const segments = rawSegments
      .map((seg: Record<string, unknown>) => {
        if (seg.answer) {
          const id = String(seg.blankId || `b${blankCounter++}`);
          return {
            blankId: id,
            answer: String(seg.answer).trim(),
            clue: String(seg.clue || 'Think about the lesson vocabulary.'),
          };
        }
        return {
          text: String(seg.text || ''),
        };
      })
      .filter((seg) => (seg.text && seg.text.length > 0) || seg.blankId);

    const distractors = Array.isArray(raw.distractors)
      ? raw.distractors.map((d) => String(d).trim()).filter(Boolean)
      : [];

    return {
      type: 'cloze',
      instructions: String(
        raw.instructions || 'Tap a blank space in the passage, then select the matching word.'
      ),
      segments,
      distractors,
    } satisfies ClozePayload;
  }

  if (format === 'bingo') {
    const rawEntries = Array.isArray(raw.entries) ? raw.entries : [];
    const entries = rawEntries.map((e: Record<string, unknown>, idx: number) => ({
      id: String(e.id || `bg-${idx + 1}`),
      term: String(e.term || `Term ${idx + 1}`),
      clue: String(e.clue || `Clue for term ${idx + 1}`),
    }));
    return {
      type: 'bingo',
      instructions: String(
        raw.instructions || 'Draw clues one at a time and tap the matching term on your 3×3 Bingo grid.'
      ),
      entries,
    } satisfies BingoPayload;
  }

  if (format === 'draw') {
    return {
      type: 'draw',
      instructions: String(
        raw.instructions || 'Draw your diagram on the canvas and stamp the vocabulary labels.'
      ),
      prompt: String(raw.prompt || 'Create a clearly labelled diagram showing the key concepts.'),
      checklist: Array.isArray(raw.checklist)
        ? raw.checklist.map((c) => String(c)).filter(Boolean)
        : ['Clear main structure', 'Accurate labels'],
      labelChips: Array.isArray(raw.labelChips)
        ? raw.labelChips.map((l) => String(l)).filter(Boolean)
        : ['Key Feature', 'Process'],
    } satisfies DrawPayload;
  }

  if (format === 'wordcloud') {
    return {
      type: 'wordcloud',
      instructions: String(
        raw.instructions || 'Submit words or short phrases to grow the live classroom word cloud.'
      ),
      prompt: String(raw.prompt || 'Share key words linked to this topic.'),
      seedWords: Array.isArray(raw.seedWords)
        ? raw.seedWords.map((w) => String(w)).filter(Boolean)
        : ['Evidence', 'Concept', 'Analysis'],
      followUpQuestion: String(
        raw.followUpQuestion || 'Choose the largest word in the cloud and explain why it matters.'
      ),
    } satisfies WordCloudPayload;
  }

  if (format === 'buzzer') {
    const rawCats = Array.isArray(raw.categories) ? raw.categories : [];
    const categories = rawCats.slice(0, 6).map((cat: Record<string, unknown>, cIdx: number) => {
      const qs = Array.isArray(cat.questions) ? cat.questions : [];
      return {
        name: String(cat.name || `Category ${cIdx + 1}`),
        questions: qs.slice(0, 6).map((q: Record<string, unknown>, qIdx: number) => {
          const opts = Array.isArray(q.options)
            ? q.options.slice(0, 4).map((o) => String(o))
            : ['Option A', 'Option B', 'Option C', 'Option D'];
          const rawIdx = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
          return {
            id: String(q.id || `bz-${cIdx}-${qIdx}`),
            points: typeof q.points === 'number' ? q.points : (qIdx + 1) * 100,
            prompt: String(q.prompt || `Challenge ${qIdx + 1}`),
            options: opts,
            correctIndex: Math.max(0, Math.min(opts.length - 1, rawIdx)),
            explanation: String(q.explanation || ''),
          };
        }),
      };
    });
    return {
      type: 'buzzer',
      instructions: String(
        raw.instructions || 'Pick a category and point tile, beat the timer, and earn points.'
      ),
      categories,
    } satisfies BuzzerPayload;
  }

  if (format === 'escape') {
    const rawStages = Array.isArray(raw.stages) ? raw.stages : [];
    const stages = rawStages.slice(0, 10).map((st: Record<string, unknown>, idx: number) => {
      const opts = Array.isArray(st.options)
        ? st.options.slice(0, 4).map((o) => String(o))
        : ['Option A', 'Option B', 'Option C', 'Option D'];
      const rawIdx = typeof st.correctIndex === 'number' ? st.correctIndex : 0;
      return {
        id: String(st.id || `esc-${idx + 1}`),
        stageTitle: String(st.stageTitle || `Lock ${idx + 1}`),
        riddle: String(st.riddle || `Solve puzzle ${idx + 1}`),
        options: opts,
        correctIndex: Math.max(0, Math.min(opts.length - 1, rawIdx)),
        codeDigit: String(st.codeDigit || String(idx + 1)).slice(0, 2),
        hint: String(st.hint || 'Re-read the key clue in the riddle.'),
        explanation: String(st.explanation || ''),
      };
    });
    return {
      type: 'escape',
      instructions: String(
        raw.instructions || 'Crack each lock in sequence to unlock the vault code.'
      ),
      storyIntro: String(
        raw.storyIntro || 'Four locks guard the classroom vault. Solve every clue to escape!'
      ),
      stages,
    } satisfies EscapePayload;
  }

  // Quiz
  const rawQuestions = Array.isArray(raw.questions) ? raw.questions : [];
  const questions = rawQuestions.map((q: Record<string, unknown>, idx: number) => {
    const options = Array.isArray(q.options)
      ? q.options.slice(0, 4).map((o) => String(o))
      : ['Option A', 'Option B', 'Option C', 'Option D'];
    const rawIdx = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
    const correctIndex = Math.max(0, Math.min(options.length - 1, rawIdx));
    const tierRaw = String(q.tier || 'Core');
    const tier: 'Support' | 'Core' | 'Stretch' =
      tierRaw === 'Support' || tierRaw === 'Stretch' ? tierRaw : 'Core';
    return {
      id: String(q.id || `q-${idx + 1}`),
      prompt: String(q.prompt || `Question ${idx + 1}`),
      options,
      correctIndex,
      hint: String(q.hint || 'Eliminate any option that contradicts the lesson objective.'),
      explanation: String(q.explanation || ''),
      discussionPrompt: String(
        q.discussionPrompt || 'Turn to a partner and explain why the other options are incorrect.'
      ),
      tier,
    };
  });

  return {
    type: 'quiz',
    instructions: String(
      raw.instructions || 'Discuss each question together and choose the best answer.'
    ),
    questions,
  } satisfies QuizPayload;
}

function buildSystemInstruction(differentiation: DifferentiationTier): string {
  return `You are a master curriculum designer helping teachers across a whole school (ages 4 to 18) run joyful, inclusive, interactive classroom activities.
Design every activity specifically for the stated Year Group's reading age, cognitive level, and curriculum depth:
- EYFS / Year 1-2: Short, concrete sentences, familiar everyday examples, warm encouraging tone.
- Year 3-6: Clear academic vocabulary with relatable analogies and gentle reasoning.
- Year 7-11 (KS3 & GCSE): Rigorous subject terminology, playful game mechanics, misconception-busting distractors, exam-ready reasoning.
- Year 12-13: Nuanced analytical precision and deeper conceptual synthesis.
When the subject is a World Language (such as French, Spanish, German, Hungarian, Russian, Italian, Mandarin, Japanese, Latin, or any custom language):
- Use authentic target-language words, phrases, and exact diacritics/accents or scripts (e.g., French é/è/ç, German ä/ö/ü/ß, Spanish ñ/á, Hungarian ő/ű/á/é, Russian Cyrillic with helpful pronunciation/meaning clues for beginners).
- Keep instructions clear in English (or dual-language for KS3/KS4) while making target-language vocabulary, grammar, conjugation, or translation the core interactive challenge.
Adapt scaffolding according to the differentiation focus: "${differentiation}".
Ensure there are zero factual errors, zero ambiguous answers, and clear pedagogical explanations that make learning genuinely fun and engaging for every child.`;
}

export async function generateClassroomActivity(
  req: GenerateActivityRequest
): Promise<ClassroomActivity> {
  const ai = getGenAIClient();
  const objectivesText = req.objectives.map((obj, idx) => `${idx + 1}. ${obj}`).join('\n');

  const countHint =
    req.questionCount && req.questionCount > 0
      ? `\nTarget Item/Question Count: Generate ${req.questionCount} questions/items/pairs/entries/steps (for quiz, sort, sequence, match, bingo, or escape stages; or scale blanks/categories accordingly).`
      : '';

  const prompt = `Create a "${req.format}" interactive classroom activity.
Subject: ${req.subject}
Year Group: ${req.yearGroup}
Topic: ${req.topic}
Differentiation Focus: ${req.differentiation}${countHint}
Lesson Objectives:
${objectivesText}

Return strictly valid JSON matching the schema.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction: buildSystemInstruction(req.differentiation),
      responseMimeType: 'application/json',
      responseSchema: getSchemaForFormat(req.format),
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as Record<string, unknown>;
  const payload = normalizePayload(req.format, parsed);

  return {
    id: `act-${crypto.randomUUID().slice(0, 8)}`,
    title: String(parsed.title || `${req.topic} (${req.format})`),
    topic: req.topic,
    yearGroup: req.yearGroup,
    subject: req.subject,
    objectives: req.objectives,
    format: req.format,
    differentiation: req.differentiation,
    estimatedMinutes:
      typeof parsed.estimatedMinutes === 'number'
        ? Math.max(4, Math.min(25, parsed.estimatedMinutes))
        : 10,
    teacherTip: String(
      parsed.teacherTip ||
        'Give pairs 20 seconds of thinking time before inviting a volunteer to share on the board.'
    ),
    inclusionNote: String(
      parsed.inclusionNote ||
        'Use Read Aloud and Hint prompts to support emerging readers while asking rapid-graspers to justify their reasoning.'
    ),
    createdAt: new Date().toISOString(),
    payload,
  };
}

export async function generateLessonPack(
  baseReq: Omit<GenerateActivityRequest, 'format'>
): Promise<ClassroomActivity[]> {
  const formats: ActivityFormat[] = ['sort', 'buzzer', 'bingo'];
  return Promise.all(
    formats.map((format) =>
      generateClassroomActivity({
        ...baseReq,
        format,
      })
    )
  );
}

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<\/(a:p|w:p|p|li|h1|h2|h3|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

async function extractTextFromZipOffice(
  buffer: Buffer,
  fileExt: string
): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const paths = Object.keys(zip.files).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  if (fileExt === 'pptx') {
    const slidePaths = paths.filter(
      (p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p)
    );
    const chunks: string[] = [];
    for (const sp of slidePaths.slice(0, 35)) {
      const content = await zip.files[sp].async('text');
      const cleaned = stripXmlTags(content);
      if (cleaned) {
        const slideNum = sp.match(/slide(\d+)\.xml/i)?.[1] ?? '';
        chunks.push(`Slide ${slideNum}: ${cleaned}`);
      }
    }
    return chunks.join('\n\n').slice(0, 28000);
  }

  if (fileExt === 'docx') {
    const docFile = zip.files['word/document.xml'];
    if (docFile) {
      const xml = await docFile.async('text');
      return stripXmlTags(xml).slice(0, 28000);
    }
  }

  // Fallback for other zip-based docs (.odt, .odp, .xlsx)
  const xmlFiles = paths.filter((p) => p.endsWith('.xml')).slice(0, 20);
  const parts: string[] = [];
  for (const xp of xmlFiles) {
    const xml = await zip.files[xp].async('text');
    const cleaned = stripXmlTags(xml);
    if (cleaned.length > 20) parts.push(cleaned);
  }
  return parts.join('\n').slice(0, 28000);
}

export async function generateActivityFromFile(
  req: GenerateFromFileRequest
): Promise<{ activities: ClassroomActivity[]; primary: ClassroomActivity }> {
  const ai = getGenAIClient();
  const buffer = Buffer.from(req.base64Data, 'base64');
  const lowerName = req.fileName.toLowerCase();
  const ext = lowerName.split('.').pop() || '';
  const mime = (req.mimeType || '').toLowerCase();

  const isMultimodalBinary =
    mime === 'application/pdf' ||
    ext === 'pdf' ||
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);

  let extractedText = '';
  if (!isMultimodalBinary) {
    if (['pptx', 'docx', 'odp', 'odt', 'xlsx'].includes(ext)) {
      extractedText = await extractTextFromZipOffice(buffer, ext);
    } else {
      extractedText = buffer.toString('utf-8').slice(0, 28000);
    }
    if (!extractedText.trim()) {
      throw new Error(
        `Could not read text from "${req.fileName}". Try exporting as PDF or PNG/JPG slides.`
      );
    }
  }

  const targetFormats: ActivityFormat[] = req.generatePack
    ? ['sort', 'buzzer', 'bingo']
    : [req.format];

  const userTopicHint = req.topic?.trim()
    ? `Teacher topic focus: ${req.topic.trim()}`
    : 'Infer the main lesson topic from the uploaded file.';
  const userObjectivesHint =
    req.objectives && req.objectives.length > 0
      ? `Teacher lesson objectives:\n${req.objectives.join('\n')}`
      : 'Infer 2 clear lesson objectives directly from the uploaded teaching material.';

  const generated = await Promise.all(
    targetFormats.map(async (fmt) => {
      const fileCountHint =
        req.questionCount && req.questionCount > 0
          ? `\nTarget Item/Question Count: Generate ${req.questionCount} questions/items/pairs/entries/steps where applicable.`
          : '';
      const instructionText = `You are creating an interactive "${fmt}" classroom activity grounded directly in the teacher's uploaded file ("${req.fileName}").
Subject: ${req.subject}
Year Group: ${req.yearGroup}
Differentiation Focus: ${req.differentiation}${fileCountHint}
${userTopicHint}
${userObjectivesHint}
${extractedText ? `\nExtracted File Content:\n${extractedText}` : ''}

Use accurate facts, examples, diagrams/text, and terminology from the uploaded file. Return strictly valid JSON matching the schema.`;

      const contents = isMultimodalBinary
        ? {
            parts: [
              {
                inlineData: {
                  mimeType:
                    ext === 'pdf'
                      ? 'application/pdf'
                      : mime || (ext === 'png' ? 'image/png' : 'image/jpeg'),
                  data: req.base64Data,
                },
              },
              { text: instructionText },
            ],
          }
        : instructionText;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: buildSystemInstruction(req.differentiation),
          responseMimeType: 'application/json',
          responseSchema: getSchemaForFormat(fmt),
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      const payload = normalizePayload(fmt, parsed);

      const resolvedTopic =
        req.topic?.trim() || String(parsed.inferredTopic || req.fileName.replace(/\.[^.]+$/, ''));
      const resolvedObjectives =
        req.objectives && req.objectives.length > 0
          ? req.objectives
          : Array.isArray(parsed.inferredObjectives) && parsed.inferredObjectives.length > 0
          ? parsed.inferredObjectives.map((o) => String(o))
          : [`Apply key concepts from ${req.fileName}.`];

      return {
        id: `act-${crypto.randomUUID().slice(0, 8)}`,
        title: String(parsed.title || `${resolvedTopic} (${fmt})`),
        topic: resolvedTopic,
        yearGroup: req.yearGroup,
        subject: req.subject,
        objectives: resolvedObjectives,
        format: fmt,
        differentiation: req.differentiation,
        estimatedMinutes:
          typeof parsed.estimatedMinutes === 'number'
            ? Math.max(4, Math.min(25, parsed.estimatedMinutes))
            : 10,
        teacherTip: String(
          parsed.teacherTip ||
            'Connect this activity back to the uploaded slides or worksheet as students explain their choices.'
        ),
        inclusionNote: String(
          parsed.inclusionNote ||
            'Use Read Aloud and Hints to scaffold key vocabulary from the source file.'
        ),
        createdAt: new Date().toISOString(),
        sourceFileName: req.fileName,
        payload,
      } satisfies ClassroomActivity;
    })
  );

  return { activities: generated, primary: generated[0] };
}

export async function adaptActivityDifferentiation(
  activity: ClassroomActivity,
  targetTier: DifferentiationTier
): Promise<ClassroomActivity> {
  const ai = getGenAIClient();
  const prompt = `Adapt the following classroom activity so it retains the exact same topic, format ("${activity.format}"), and lesson objectives, but is specifically tailored for "${targetTier}" within ${activity.yearGroup}.
- If "Visual & EAL Support": simplify sentence structures, clarify Tier 2/3 terms with friendly clues, make prompts extra concrete.
- If "Stretch & Challenge": raise conceptual depth, introduce subtler misconceptions/distractors, and add deeper reasoning prompts.
- If "All Learners": provide a balanced mix of accessible entry points and core curriculum challenge.

Original activity JSON:
${JSON.stringify({
  title: activity.title,
  teacherTip: activity.teacherTip,
  inclusionNote: activity.inclusionNote,
  payload: activity.payload,
})}

Return strictly valid JSON matching the schema.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: getSchemaForFormat(activity.format),
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as Record<string, unknown>;
  const payload = normalizePayload(activity.format, parsed);

  return {
    ...activity,
    id: `act-${crypto.randomUUID().slice(0, 8)}`,
    title: String(parsed.title || `${activity.title} (${targetTier})`),
    differentiation: targetTier,
    teacherTip: String(parsed.teacherTip || activity.teacherTip),
    inclusionNote: String(parsed.inclusionNote || activity.inclusionNote),
    createdAt: new Date().toISOString(),
    isStarter: false,
    payload,
  };
}

export async function generateMoreActivityItems(
  activity: ClassroomActivity,
  addCount = 3
): Promise<ClassroomActivity> {
  const ai = getGenAIClient();
  const safeAddCount = Math.max(1, Math.min(8, addCount));
  const suffix = crypto.randomUUID().slice(0, 5);

  const extraFormatGuidance =
    activity.format === 'sort'
      ? `Generate ${safeAddCount} NEW sort items that fit the EXACT existing bucket IDs (${activity.payload.type === 'sort' ? activity.payload.buckets.map((b) => `"${b.id}" (${b.label})`).join(', ') : ''}). Keep those exact buckets in the JSON response.`
      : activity.format === 'buzzer'
      ? `Generate 1 NEW category (with 3 fresh questions worth 100, 200, and 300 points) OR ${safeAddCount} fresh questions not already in the activity.`
      : `Generate ${safeAddCount} NEW items/questions/pairs/entries/steps/stages/labels/words that do NOT duplicate existing items.`;

  const prompt = `The teacher wants to add ${safeAddCount} more questions/items to this existing "${activity.format}" classroom activity.
Topic: ${activity.topic}
Subject: ${activity.subject}
Year Group: ${activity.yearGroup}
Differentiation: ${activity.differentiation}
Lesson Objectives: ${activity.objectives.join('; ')}

Existing activity items (DO NOT repeat these):
${JSON.stringify(activity.payload)}

${extraFormatGuidance}
Return strictly valid JSON matching the schema containing ONLY the newly generated items/questions/entries.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction: buildSystemInstruction(activity.differentiation),
      responseMimeType: 'application/json',
      responseSchema: getSchemaForFormat(activity.format),
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as Record<string, unknown>;
  const freshPayload = normalizePayload(activity.format, parsed);
  const current = activity.payload;
  let mergedPayload: ActivityPayload = current;

  if (current.type === 'quiz' && freshPayload.type === 'quiz') {
    const newQs = freshPayload.questions.slice(0, safeAddCount).map((q, i) => ({
      ...q,
      id: `q-${suffix}-${i + 1}`,
    }));
    mergedPayload = { ...current, questions: [...current.questions, ...newQs] };
  } else if (current.type === 'sort' && freshPayload.type === 'sort') {
    const validIds = new Set(current.buckets.map((b) => b.id));
    const fallbackId = current.buckets[0]?.id || 'bucket-1';
    const newItems = freshPayload.items.slice(0, safeAddCount).map((item, i) => ({
      ...item,
      id: `item-${suffix}-${i + 1}`,
      bucketId: validIds.has(item.bucketId) ? item.bucketId : fallbackId,
    }));
    mergedPayload = { ...current, items: [...current.items, ...newItems] };
  } else if (current.type === 'sequence' && freshPayload.type === 'sequence') {
    const startOrder = current.steps.length;
    const newSteps = freshPayload.steps.slice(0, safeAddCount).map((s, i) => ({
      ...s,
      id: `step-${suffix}-${i + 1}`,
      order: startOrder + i + 1,
    }));
    mergedPayload = { ...current, steps: [...current.steps, ...newSteps] };
  } else if (current.type === 'match' && freshPayload.type === 'match') {
    const newPairs = freshPayload.pairs.slice(0, safeAddCount).map((p, i) => ({
      ...p,
      id: `pair-${suffix}-${i + 1}`,
    }));
    mergedPayload = { ...current, pairs: [...current.pairs, ...newPairs] };
  } else if (current.type === 'bingo' && freshPayload.type === 'bingo') {
    const newEntries = freshPayload.entries.slice(0, safeAddCount).map((e, i) => ({
      ...e,
      id: `bg-${suffix}-${i + 1}`,
    }));
    mergedPayload = { ...current, entries: [...current.entries, ...newEntries] };
  } else if (current.type === 'escape' && freshPayload.type === 'escape') {
    const startIdx = current.stages.length;
    const newStages = freshPayload.stages.slice(0, safeAddCount).map((st, i) => ({
      ...st,
      id: `esc-${suffix}-${i + 1}`,
      stageTitle: st.stageTitle || `Lock ${startIdx + i + 1}`,
    }));
    mergedPayload = { ...current, stages: [...current.stages, ...newStages] };
  } else if (current.type === 'buzzer' && freshPayload.type === 'buzzer') {
    const nextCats = current.categories.map((cat, cIdx) => {
      const incoming = freshPayload.categories[cIdx];
      if (!incoming || incoming.questions.length === 0) return cat;
      const maxPts = cat.questions.reduce((m, q) => Math.max(m, q.points), 0);
      const extraQ = {
        ...incoming.questions[0],
        id: `bz-${suffix}-${cIdx}`,
        points: maxPts + 100,
      };
      return { ...cat, questions: [...cat.questions, extraQ] };
    });
    mergedPayload = { ...current, categories: nextCats };
  } else if (current.type === 'cloze' && freshPayload.type === 'cloze') {
    let blankCounter = current.segments.filter((s) => s.blankId).length + 1;
    const extraSegs = freshPayload.segments.map((s) =>
      s.blankId ? { ...s, blankId: `b-${suffix}-${blankCounter++}` } : s
    );
    const mergedDistractors = Array.from(
      new Set([...current.distractors, ...freshPayload.distractors])
    );
    mergedPayload = {
      ...current,
      segments: [...current.segments, { text: ' ' }, ...extraSegs],
      distractors: mergedDistractors,
    };
  } else if (current.type === 'draw' && freshPayload.type === 'draw') {
    mergedPayload = {
      ...current,
      checklist: Array.from(
        new Set([...current.checklist, ...freshPayload.checklist.slice(0, safeAddCount)])
      ),
      labelChips: Array.from(
        new Set([...current.labelChips, ...freshPayload.labelChips.slice(0, safeAddCount)])
      ),
    };
  } else if (current.type === 'wordcloud' && freshPayload.type === 'wordcloud') {
    mergedPayload = {
      ...current,
      seedWords: Array.from(
        new Set([...current.seedWords, ...freshPayload.seedWords.slice(0, safeAddCount)])
      ),
    };
  }

  return {
    ...activity,
    payload: mergedPayload,
  };
}

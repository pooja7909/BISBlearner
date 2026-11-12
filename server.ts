import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { STARTER_ACTIVITIES } from './src/data/starterActivities.ts';
import {
  DEFAULT_SUBJECTS,
  type ActivityFormat,
  type ClassroomActivity,
  type DifferentiationTier,
  type LiveRoom,
  type PlayMode,
  type RoomParticipant,
  type SubjectArea,
  type YearGroup,
} from './src/types.ts';
import {
  adaptActivityDifferentiation,
  generateActivityFromFile,
  generateClassroomActivity,
  generateLessonPack,
  generateMoreActivityItems,
} from './server/geminiGenerator.ts';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');
const SUBJECTS_FILE = path.join(DATA_DIR, 'subjects.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const DEFAULT_HERO_HEADER = 'Reception to Sixth Form · Every Subject · Individual or Group Play';

let activitiesCache: ClassroomActivity[] = [];
let subjectsCache: string[] = [...DEFAULT_SUBJECTS];
let settingsCache: { heroHeader: string } = { heroHeader: DEFAULT_HERO_HEADER };
const liveRooms = new Map<string, LiveRoom>();

async function loadActivities(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(ACTIVITIES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const existingIds = new Set(parsed.map((a: ClassroomActivity) => a.id));
      const missingStarters = STARTER_ACTIVITIES.filter((s) => !existingIds.has(s.id));
      activitiesCache = [...parsed, ...missingStarters];
      if (missingStarters.length > 0) {
        await saveActivities();
      }
      return;
    }
  } catch {
    // First boot or missing store: initialize with starter pack
  }
  activitiesCache = [...STARTER_ACTIVITIES];
  await saveActivities();
}

async function saveActivities(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ACTIVITIES_FILE, JSON.stringify(activitiesCache, null, 2), 'utf-8');
}

async function loadSubjects(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(SUBJECTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const merged = [...DEFAULT_SUBJECTS] as string[];
      for (const s of parsed) {
        const clean = String(s || '').trim();
        if (clean && !merged.some((m) => m.toLowerCase() === clean.toLowerCase())) {
          merged.push(clean);
        }
      }
      subjectsCache = merged;
      return;
    }
  } catch {
    // First boot: initialize with default subjects + world languages
  }
  subjectsCache = [...DEFAULT_SUBJECTS];
  await saveSubjects();
}

async function saveSubjects(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SUBJECTS_FILE, JSON.stringify(subjectsCache, null, 2), 'utf-8');
}

async function ensureSubjectSaved(name: string): Promise<string> {
  const clean = name.trim();
  if (!clean) return 'Science';
  const existing = subjectsCache.find((s) => s.toLowerCase() === clean.toLowerCase());
  if (existing) return existing;
  subjectsCache = [...subjectsCache, clean];
  await saveSubjects();
  return clean;
}

async function loadSettings(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as { heroHeader?: unknown };
    if (typeof parsed?.heroHeader === 'string' && parsed.heroHeader.trim()) {
      settingsCache = { heroHeader: parsed.heroHeader.trim().slice(0, 120) };
      return;
    }
  } catch {
    // First boot or missing settings file: initialize with defaults
  }
  settingsCache = { heroHeader: DEFAULT_HERO_HEADER };
  await saveSettings();
}

async function saveSettings(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settingsCache, null, 2), 'utf-8');
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return liveRooms.has(code) ? generateRoomCode() : code;
}

function extractGeminiError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('GEMINI_API_KEY')) {
    return {
      status: 500,
      message: 'Gemini API key is not configured. Check Settings > Secrets.',
    };
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'AI generation quota temporarily reached. Please wait a moment and try again.',
    };
  }
  if (msg.includes('403') || msg.includes('400') || msg.includes('API_KEY_INVALID')) {
    return {
      status: 400,
      message: 'Unable to validate the Gemini API key. Check Settings > Secrets.',
    };
  }
  return {
    status: 500,
    message: msg || 'Failed to generate activity.',
  };
}

async function startServer() {
  await Promise.all([loadActivities(), loadSubjects(), loadSettings()]);

  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activityCount: activitiesCache.length, subjectCount: subjectsCache.length });
  });

  app.get('/api/settings', (_req, res) => {
    res.json(settingsCache);
  });

  app.put('/api/settings', async (req, res) => {
    const rawHeader = String((req.body as { heroHeader?: string })?.heroHeader || '').trim();
    if (!rawHeader) {
      res.status(400).json({ error: 'Please enter header text or reset to default.' });
      return;
    }
    if (rawHeader.length > 120) {
      res.status(400).json({ error: 'Header text must be 120 characters or fewer.' });
      return;
    }
    settingsCache = { heroHeader: rawHeader };
    await saveSettings();
    res.json(settingsCache);
  });

  app.get('/api/subjects', (_req, res) => {
    res.json({ subjects: subjectsCache });
  });

  app.post('/api/subjects', async (req, res) => {
    const rawName = String((req.body as { name?: string })?.name || '').trim();
    if (!rawName) {
      res.status(400).json({ error: 'Please enter a subject or language name.' });
      return;
    }
    if (rawName.length > 48) {
      res.status(400).json({ error: 'Subject name must be 48 characters or fewer.' });
      return;
    }
    const saved = await ensureSubjectSaved(rawName);
    res.json({ subject: saved, subjects: subjectsCache });
  });

  app.get('/api/activities', (_req, res) => {
    res.json({ activities: activitiesCache });
  });

  app.post('/api/activities/generate', async (req, res) => {
    try {
      const {
        topic,
        yearGroup,
        subject,
        objectives,
        format,
        differentiation,
        generatePack,
        questionCount,
      } = req.body as {
        topic?: string;
        yearGroup?: YearGroup;
        subject?: SubjectArea;
        objectives?: string[];
        format?: ActivityFormat;
        differentiation?: DifferentiationTier;
        generatePack?: boolean;
        questionCount?: number;
      };

      if (!topic || !topic.trim()) {
        res.status(400).json({ error: 'Please enter a lesson topic.' });
        return;
      }

      const cleanObjectives = Array.isArray(objectives)
        ? objectives.map((o) => String(o).trim()).filter(Boolean)
        : [];
      if (cleanObjectives.length === 0) {
        res.status(400).json({ error: 'Please enter at least one lesson objective.' });
        return;
      }

      const safeYearGroup = (yearGroup || 'Year 5-6 (Upper KS2)') as YearGroup;
      const safeSubject = await ensureSubjectSaved(subject || 'Science');
      const safeDiff = (differentiation || 'All Learners') as DifferentiationTier;
      const safeCount =
        typeof questionCount === 'number' && questionCount >= 3 && questionCount <= 15
          ? Math.round(questionCount)
          : undefined;

      if (generatePack) {
        const pack = await generateLessonPack({
          topic: topic.trim(),
          yearGroup: safeYearGroup,
          subject: safeSubject,
          objectives: cleanObjectives,
          differentiation: safeDiff,
          questionCount: safeCount,
        });
        activitiesCache = [...pack, ...activitiesCache];
        await saveActivities();
        res.json({ activities: pack, primary: pack[0] });
        return;
      }

      const safeFormat = (format || 'sort') as ActivityFormat;
      const created = await generateClassroomActivity({
        topic: topic.trim(),
        yearGroup: safeYearGroup,
        subject: safeSubject,
        objectives: cleanObjectives,
        format: safeFormat,
        differentiation: safeDiff,
        questionCount: safeCount,
      });

      activitiesCache = [created, ...activitiesCache];
      await saveActivities();
      res.json({ activity: created });
    } catch (err) {
      const { status, message } = extractGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/activities/generate-from-file', async (req, res) => {
    try {
      const {
        fileName,
        mimeType,
        base64Data,
        topic,
        yearGroup,
        subject,
        objectives,
        format,
        differentiation,
        generatePack,
        questionCount,
      } = req.body as {
        fileName?: string;
        mimeType?: string;
        base64Data?: string;
        topic?: string;
        yearGroup?: YearGroup;
        subject?: SubjectArea;
        objectives?: string[];
        format?: ActivityFormat;
        differentiation?: DifferentiationTier;
        generatePack?: boolean;
        questionCount?: number;
      };

      if (!fileName || !base64Data) {
        res.status(400).json({ error: 'Please select a presentation, PDF, image, or document file.' });
        return;
      }

      const cleanObjectives = Array.isArray(objectives)
        ? objectives.map((o) => String(o).trim()).filter(Boolean)
        : [];

      const safeSubject = await ensureSubjectSaved(subject || 'Science');
      const safeCount =
        typeof questionCount === 'number' && questionCount >= 3 && questionCount <= 15
          ? Math.round(questionCount)
          : undefined;

      const result = await generateActivityFromFile({
        fileName,
        mimeType: mimeType || 'application/octet-stream',
        base64Data,
        topic: topic?.trim(),
        yearGroup: (yearGroup || 'Year 7-9 (KS3)') as YearGroup,
        subject: safeSubject,
        objectives: cleanObjectives,
        format: (format || 'quiz') as ActivityFormat,
        differentiation: (differentiation || 'All Learners') as DifferentiationTier,
        generatePack: Boolean(generatePack),
        questionCount: safeCount,
      });

      activitiesCache = [...result.activities, ...activitiesCache];
      await saveActivities();
      res.json({ activities: result.activities, primary: result.primary });
    } catch (err) {
      const { status, message } = extractGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.put('/api/activities/:id', async (req, res) => {
    const { id } = req.params;
    const idx = activitiesCache.findIndex((a) => a.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Activity not found.' });
      return;
    }

    const existing = activitiesCache[idx];
    const body = req.body as Partial<ClassroomActivity>;
    const updated: ClassroomActivity = {
      ...existing,
      title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : existing.title,
      estimatedMinutes:
        typeof body.estimatedMinutes === 'number' && body.estimatedMinutes > 0
          ? Math.min(60, Math.round(body.estimatedMinutes))
          : existing.estimatedMinutes,
      objectives: Array.isArray(body.objectives) ? body.objectives : existing.objectives,
      teacherTip: typeof body.teacherTip === 'string' ? body.teacherTip : existing.teacherTip,
      inclusionNote:
        typeof body.inclusionNote === 'string' ? body.inclusionNote : existing.inclusionNote,
      payload:
        body.payload && body.payload.type === existing.payload.type
          ? body.payload
          : existing.payload,
    };

    activitiesCache[idx] = updated;
    await saveActivities();
    res.json({ activity: updated });
  });

  app.post('/api/activities/:id/more-items', async (req, res) => {
    try {
      const { id } = req.params;
      const { count } = req.body as { count?: number };
      const idx = activitiesCache.findIndex((a) => a.id === id);
      if (idx === -1) {
        res.status(404).json({ error: 'Activity not found.' });
        return;
      }

      const existing = activitiesCache[idx];
      const expanded = await generateMoreActivityItems(
        existing,
        typeof count === 'number' ? count : 3
      );
      activitiesCache[idx] = expanded;
      await saveActivities();
      res.json({ activity: expanded });
    } catch (err) {
      const { status, message } = extractGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/activities/:id/adapt', async (req, res) => {
    try {
      const { id } = req.params;
      const { targetTier } = req.body as { targetTier?: DifferentiationTier };
      const existing = activitiesCache.find((a) => a.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Activity not found.' });
        return;
      }
      const adapted = await adaptActivityDifferentiation(
        existing,
        targetTier || 'Visual & EAL Support'
      );
      activitiesCache = [adapted, ...activitiesCache];
      await saveActivities();
      res.json({ activity: adapted });
    } catch (err) {
      const { status, message } = extractGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.delete('/api/activities/:id', async (req, res) => {
    const { id } = req.params;
    const before = activitiesCache.length;
    activitiesCache = activitiesCache.filter((a) => a.id !== id);
    if (activitiesCache.length === before) {
      res.status(404).json({ error: 'Activity not found.' });
      return;
    }
    await saveActivities();
    res.json({ ok: true });
  });

  // Live Classroom Room Endpoints
  app.get('/api/rooms', (_req, res) => {
    const sessions = Array.from(liveRooms.values())
      .map((room) => {
        const activity = activitiesCache.find((a) => a.id === room.activityId);
        return activity ? { room, activity } : null;
      })
      .filter(Boolean)
      .sort((a, b) =>
        b!.room.createdAt.localeCompare(a!.room.createdAt)
      );
    res.json({ sessions });
  });

  app.delete('/api/rooms/:code', (req, res) => {
    const code = String(req.params.code || '').toUpperCase().trim();
    if (!liveRooms.delete(code)) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/api/rooms', (req, res) => {
    const { activityId, playMode } = req.body as {
      activityId?: string;
      playMode?: PlayMode;
    };
    const activity = activitiesCache.find((a) => a.id === activityId);
    if (!activity) {
      res.status(404).json({ error: 'Activity not found.' });
      return;
    }

    const code = generateRoomCode();
    const initialWords =
      activity.payload.type === 'wordcloud'
        ? activity.payload.seedWords.map((w, idx) => ({
            id: `seed-${idx}`,
            word: w,
            author: 'Starter',
            team: 'Class',
            pinned: false,
          }))
        : [];

    const room: LiveRoom = {
      code,
      activityId: activity.id,
      createdAt: new Date().toISOString(),
      playMode: playMode === 'group' ? 'group' : 'individual',
      paused: false,
      bingoCalledIds: [],
      spotlightDrawingId: null,
      participants: [],
      wordSubmissions: initialWords,
      drawingSubmissions: [],
    };
    liveRooms.set(code, room);
    res.json({ room, activity });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = String(req.params.code || '').toUpperCase().trim();
    const room = liveRooms.get(code);
    if (!room) {
      res.status(404).json({
        error: 'Room code not found. Check the 4-character code on the board.',
      });
      return;
    }
    const activity = activitiesCache.find((a) => a.id === room.activityId);
    if (!activity) {
      res.status(404).json({ error: 'The activity for this room is no longer available.' });
      return;
    }
    res.json({ room, activity });
  });

  app.post('/api/rooms/:code/join', (req, res) => {
    const code = String(req.params.code || '').toUpperCase().trim();
    const room = liveRooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room code not found. Check with your teacher.' });
      return;
    }
    const activity = activitiesCache.find((a) => a.id === room.activityId);
    if (!activity) {
      res.status(404).json({ error: 'Activity not found.' });
      return;
    }
    const { name, team, character } = req.body as {
      name?: string;
      team?: string;
      character?: string;
    };
    const cleanName = String(name || '').trim().slice(0, 28);
    if (!cleanName) {
      res.status(400).json({ error: 'Please enter your name to join.' });
      return;
    }

    const participant: RoomParticipant = {
      id: `stu-${crypto.randomUUID().slice(0, 8)}`,
      name: cleanName,
      team: String(team || 'Oak').trim(),
      character: String(character || 'fox').trim().slice(0, 20),
      score: 0,
      total: 0,
      completed: false,
      summary: 'Joined session',
      updatedAt: new Date().toISOString(),
    };
    room.participants.push(participant);
    res.json({ participantId: participant.id, room, activity });
  });

  app.post('/api/rooms/:code/progress', (req, res) => {
    const code = String(req.params.code || '').toUpperCase().trim();
    const room = liveRooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    const { participantId, score, total, completed, summary } = req.body as {
      participantId?: string;
      score?: number;
      total?: number;
      completed?: boolean;
      summary?: string;
    };
    const participant = room.participants.find((p) => p.id === participantId);
    if (!participant) {
      res.status(404).json({ error: 'Participant not found.' });
      return;
    }
    if (typeof score === 'number') participant.score = score;
    if (typeof total === 'number') participant.total = total;
    if (typeof completed === 'boolean') participant.completed = completed;
    if (typeof summary === 'string') participant.summary = summary;
    participant.updatedAt = new Date().toISOString();

    res.json({ ok: true, room });
  });

  app.post('/api/rooms/:code/word', (req, res) => {
    const code = String(req.params.code || '').toUpperCase().trim();
    const room = liveRooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    if (room.paused) {
      res.status(403).json({ error: 'Submissions are currently paused by the teacher.' });
      return;
    }
    const { word, author, team } = req.body as {
      word?: string;
      author?: string;
      team?: string;
    };
    const cleanWord = String(word || '').trim().slice(0, 32);
    if (!cleanWord) {
      res.status(400).json({ error: 'Enter a word or short phrase.' });
      return;
    }
    room.wordSubmissions.push({
      id: `w-${crypto.randomUUID().slice(0, 8)}`,
      word: cleanWord,
      author: String(author || 'Student').trim(),
      team: String(team || 'Class').trim(),
      pinned: false,
    });
    res.json({ ok: true, room });
  });

  app.post('/api/rooms/:code/drawing', (req, res) => {
    const code = String(req.params.code || '').toUpperCase().trim();
    const room = liveRooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }
    if (room.paused) {
      res.status(403).json({ error: 'Submissions are currently paused by the teacher.' });
      return;
    }
    const { author, team, imageDataUrl } = req.body as {
      author?: string;
      team?: string;
      imageDataUrl?: string;
    };
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      res.status(400).json({ error: 'Invalid drawing image.' });
      return;
    }
    const submission = {
      id: `drw-${crypto.randomUUID().slice(0, 8)}`,
      author: String(author || 'Student').trim(),
      team: String(team || 'Class').trim(),
      imageDataUrl,
      submittedAt: new Date().toISOString(),
    };
    room.drawingSubmissions.unshift(submission);
    res.json({ ok: true, submission, room });
  });

  app.post('/api/rooms/:code/control', (req, res) => {
    const code = String(req.params.code || '').toUpperCase().trim();
    const room = liveRooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }

    const {
      paused,
      playMode,
      bingoEntryId,
      resetBingo,
      togglePinWordId,
      deleteWordId,
      spotlightDrawingId,
      resetRoom,
    } = req.body as {
      paused?: boolean;
      playMode?: PlayMode;
      bingoEntryId?: string;
      resetBingo?: boolean;
      togglePinWordId?: string;
      deleteWordId?: string;
      spotlightDrawingId?: string | null;
      resetRoom?: boolean;
    };

    if (typeof paused === 'boolean') room.paused = paused;
    if (playMode === 'individual' || playMode === 'group') room.playMode = playMode;
    if (resetBingo) room.bingoCalledIds = [];
    if (bingoEntryId && !room.bingoCalledIds.includes(bingoEntryId)) {
      room.bingoCalledIds.push(bingoEntryId);
    }
    if (togglePinWordId) {
      room.wordSubmissions = room.wordSubmissions.map((w) =>
        w.id === togglePinWordId ? { ...w, pinned: !w.pinned } : w
      );
    }
    if (deleteWordId) {
      room.wordSubmissions = room.wordSubmissions.filter((w) => w.id !== deleteWordId);
    }
    if (spotlightDrawingId !== undefined) {
      room.spotlightDrawingId = spotlightDrawingId;
    }
    if (resetRoom) {
      room.bingoCalledIds = [];
      room.spotlightDrawingId = null;
      room.drawingSubmissions = [];
      room.participants = room.participants.map((p) => ({
        ...p,
        score: 0,
        completed: false,
        summary: 'Ready',
      }));
    }

    res.json({ ok: true, room });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chalkboard Studio server running on http://localhost:${PORT}`);
  });
}

startServer();

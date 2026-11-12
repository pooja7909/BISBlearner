import { STARTER_ACTIVITIES } from '../data/starterActivities.ts';
import { DEFAULT_SUBJECTS, type ClassroomActivity } from '../types.ts';

const ACTIVITIES_KEY = 'chalkboard_activities_v1';
const SUBJECTS_KEY = 'chalkboard_subjects_v1';
const HERO_HEADER_KEY = 'chalkboard_hero_header_v1';

export async function parseJsonResponse<T>(
  res: Response
): Promise<{ isJson: true; ok: boolean; data: T } | { isJson: false; ok: false }> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    return { isJson: false, ok: false };
  }
  try {
    const data = (await res.json()) as T;
    return { isJson: true, ok: res.ok, data };
  } catch {
    return { isJson: false, ok: false };
  }
}

export function loadLocalActivities(): ClassroomActivity[] {
  try {
    const raw = localStorage.getItem(ACTIVITIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const ids = new Set(parsed.map((a: ClassroomActivity) => a.id));
        const missing = STARTER_ACTIVITIES.filter((s) => !ids.has(s.id));
        return [...parsed, ...missing];
      }
    }
  } catch {
    // Ignore storage errors
  }
  return [...STARTER_ACTIVITIES];
}

export function saveLocalActivities(activities: ClassroomActivity[]): void {
  try {
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
  } catch {
    // Ignore storage quota errors
  }
}

export function upsertLocalActivity(updated: ClassroomActivity): void {
  const current = loadLocalActivities();
  const exists = current.some((a) => a.id === updated.id);
  const next = exists
    ? current.map((a) => (a.id === updated.id ? updated : a))
    : [updated, ...current];
  saveLocalActivities(next);
}

export function deleteLocalActivity(id: string): void {
  const current = loadLocalActivities();
  saveLocalActivities(current.filter((a) => a.id !== id));
}

export function loadLocalSubjects(): string[] {
  try {
    const raw = localStorage.getItem(SUBJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = [...DEFAULT_SUBJECTS] as string[];
        for (const item of parsed) {
          const clean = String(item || '').trim();
          if (clean && !merged.some((m) => m.toLowerCase() === clean.toLowerCase())) {
            merged.push(clean);
          }
        }
        return merged;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return [...DEFAULT_SUBJECTS];
}

export function saveLocalSubjects(subjects: string[]): void {
  try {
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadLocalHeroHeader(fallback: string): string {
  try {
    const val = localStorage.getItem(HERO_HEADER_KEY);
    if (val && val.trim()) return val.trim();
  } catch {
    // Ignore storage errors
  }
  return fallback;
}

export function saveLocalHeroHeader(text: string): void {
  try {
    localStorage.setItem(HERO_HEADER_KEY, text);
  } catch {
    // Ignore storage quota errors
  }
}

/*
 * Each browser gets a random "device key" the first time it opens the app.
 * It is sent with every /api request so the server knows:
 *   - which lessons this teacher made (only they can delete them), and
 *   - which live rooms this teacher started (only they can pause/reset/close them).
 * Nothing to type or remember. Clearing the browser's site data creates a new key.
 *
 * An IT admin can open the site once with ?admin=THEKEY (matching the ADMIN_KEY
 * server setting). That browser can then delete any lesson and edit the home page text.
 */

const OWNER_STORAGE = 'cs:device-key';
const ADMIN_STORAGE = 'cs:admin-key';

function randomKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}-${Math.random()
    .toString(36)
    .slice(2, 14)}`;
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing: fall back to an in-memory key for this visit.
  }
}

let memoryKey: string | null = null;

export function getDeviceKey(): string {
  const stored = safeGet(OWNER_STORAGE);
  if (stored) return stored;
  if (!memoryKey) {
    memoryKey = randomKey();
    safeSet(OWNER_STORAGE, memoryKey);
  }
  return memoryKey;
}

/** Adds the device (and admin) key to every same-site /api request. Call once at startup. */
export function installApiHeaders(): void {
  const params = new URLSearchParams(window.location.search);
  const adminParam = params.get('admin');
  if (adminParam) {
    safeSet(ADMIN_STORAGE, adminParam);
    params.delete('admin');
    const rest = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const isApi = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
    if (!isApi) return originalFetch(input, init);

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('x-owner-key', getDeviceKey());
    const admin = safeGet(ADMIN_STORAGE);
    if (admin) headers.set('x-admin-key', admin);
    return originalFetch(input, { ...init, headers });
  };
}

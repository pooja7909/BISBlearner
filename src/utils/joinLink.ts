/** The short address pupils type, e.g. "chalkboard.myschool.org/join". */
export function pupilJoinAddress(): string {
  return `${window.location.host}/join`;
}

/** Full link with the room code filled in (used for the QR code). */
export function pupilJoinUrl(code: string): string {
  return `${window.location.origin}/join?room=${encodeURIComponent(code)}`;
}

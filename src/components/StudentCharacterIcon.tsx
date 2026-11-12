interface StudentCharacterIconProps {
  character?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StudentCharacterIcon({
  character = 'fox',
  size = 'md',
}: StudentCharacterIconProps) {
  const dim =
    size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-11 w-11' : 'h-8 w-8';

  switch (character) {
    case 'owl':
      return (
        <span
          className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 32 32" className="h-3/4 w-3/4" fill="none">
            <path d="M8 10L11 6L14 9H18L21 6L24 10V21C24 24.5 20.5 27 16 27C11.5 27 8 24.5 8 21V10Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="12.5" cy="15" r="2.5" fill="white" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="19.5" cy="15" r="2.5" fill="white" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12.5" cy="15" r="1" fill="currentColor" />
            <circle cx="19.5" cy="15" r="1" fill="currentColor" />
            <path d="M14.5 18.5L16 21L17.5 18.5H14.5Z" fill="#D97706" />
          </svg>
        </span>
      );
    case 'bot':
      return (
        <span
          className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 32 32" className="h-3/4 w-3/4" fill="none">
            <line x1="16" y1="5" x2="16" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="4.5" r="1.5" fill="#0284C7" />
            <rect x="7" y="9" width="18" height="16" rx="4" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
            <circle cx="12.5" cy="16" r="1.8" fill="currentColor" />
            <circle cx="19.5" cy="16" r="1.8" fill="currentColor" />
            <path d="M12 20.5H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      );
    case 'astro':
      return (
        <span
          className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 32 32" className="h-3/4 w-3/4" fill="none">
            <circle cx="16" cy="15" r="9.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" />
            <rect x="10" y="10.5" width="12" height="8" rx="4" fill="#1E3A8A" />
            <circle cx="13.5" cy="14" r="1.2" fill="#93C5FD" />
            <path d="M10 24.5C11.5 22.5 20.5 22.5 22 24.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      );
    case 'bear':
      return (
        <span
          className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 32 32" className="h-3/4 w-3/4" fill="none">
            <circle cx="9.5" cy="9.5" r="3" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="2" />
            <circle cx="22.5" cy="9.5" r="3" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="2" />
            <circle cx="16" cy="17" r="9" fill="white" stroke="currentColor" strokeWidth="2" />
            <circle cx="13" cy="15" r="1.3" fill="currentColor" />
            <circle cx="19" cy="15" r="1.3" fill="currentColor" />
            <ellipse cx="16" cy="19" rx="3" ry="2.2" fill="currentColor" fillOpacity="0.2" />
            <circle cx="16" cy="18.2" r="1.1" fill="currentColor" />
          </svg>
        </span>
      );
    case 'cat':
      return (
        <span
          className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 32 32" className="h-3/4 w-3/4" fill="none">
            <path d="M8 12L9.5 6L14 10H18L22.5 6L24 12V20C24 24 20.5 26.5 16 26.5C11.5 26.5 8 24 8 20V12Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="12.5" cy="16" r="1.4" fill="currentColor" />
            <circle cx="19.5" cy="16" r="1.4" fill="currentColor" />
            <path d="M14.5 19.5Q16 21 17.5 19.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      );
    case 'dino':
      return (
        <span
          className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 32 32" className="h-3/4 w-3/4" fill="none">
            <path d="M9 25V13C9 9 12.5 6.5 17 6.5C21 6.5 24 9 24 13V15.5H17.5V19H22.5C22.5 23 19.5 25 15.5 25H9Z" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="18.5" cy="11" r="1.3" fill="currentColor" />
            <path d="M6.5 11L9 12.5M6.5 16L9 17.5M6.5 21L9 22.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      );
    case 'comet':
      return (
        <span
          className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 32 32" className="h-3/4 w-3/4" fill="none">
            <path d="M16 6L18.8 12.2L25.5 13L20.5 17.6L21.9 24.3L16 21L10.1 24.3L11.5 17.6L6.5 13L13.2 12.2L16 6Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="14" cy="15.5" r="1" fill="currentColor" />
            <circle cx="18" cy="15.5" r="1" fill="currentColor" />
          </svg>
        </span>
      );
    case 'fox':
    default:
      return (
        <span
          className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 32 32" className="h-3/4 w-3/4" fill="none">
            <path d="M7 11L10 5L14.5 10H17.5L22 5L25 11L23 22L16 26.5L9 22L7 11Z" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="12.5" cy="15.5" r="1.3" fill="currentColor" />
            <circle cx="19.5" cy="15.5" r="1.3" fill="currentColor" />
            <circle cx="16" cy="21" r="1.5" fill="currentColor" />
          </svg>
        </span>
      );
  }
}

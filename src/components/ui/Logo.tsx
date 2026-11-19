/** Windowsill's mark: a four-pane window resting on a sill, with a small sprout. */
export function Logo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect x="6" y="4" width="20" height="20" rx="4" className="fill-accent-soft stroke-accent" strokeWidth="2" />
      <path d="M16 5v18M7 14h18" className="stroke-accent" strokeWidth="2" />
      <rect x="3" y="24" width="26" height="4" rx="2" className="fill-accent" />
      <path d="M22 24c0-2.5 1-4 3-4.5M22 24c0-1.8-.8-3-2.4-3.4" className="stroke-accent" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

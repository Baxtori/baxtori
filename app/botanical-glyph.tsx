type BotanicalGlyphProps = {
  className?: string;
};

export function BotanicalGlyph({ className = "" }: BotanicalGlyphProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12.2 10.8C9.9 9.1 9.4 6 11.2 4.8c1.9-1.2 3.5 1.2 2.2 4.6-.3.8-.7 1.2-1.2 1.4Z" />
      <path d="M13.4 11.5c.8-2.7 3.5-4.2 5-2.8 1.6 1.5-.2 3.8-3.6 3.8-.7 0-1.1-.3-1.4-1Z" />
      <path d="M13.1 13c2.8.1 4.8 2.3 3.8 4.1-1.1 2-3.8.8-4.6-2.7-.2-.7.1-1.1.8-1.4Z" />
      <path d="M11.3 13.1c.5 2.8-1.2 5.2-3.2 4.5-2.1-.7-1.5-3.6 1.8-5 .7-.3 1.1-.1 1.4.5Z" />
      <path d="M10.6 11.6c-2.5 1.3-5.3.2-5-1.9.3-2.2 3.2-2.2 5.3.6.4.6.3 1-.3 1.3Z" />
      <circle cx="12" cy="12" r="1.55" />
    </svg>
  );
}

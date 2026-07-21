import { BotanicalGlyph } from "./botanical-glyph";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`botanical-brand-mark ${className}`.trim()}>
      <BotanicalGlyph />
    </span>
  );
}

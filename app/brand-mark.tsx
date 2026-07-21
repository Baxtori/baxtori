export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`botanical-brand-mark ${className}`.trim()}>
      {/* A cropped fiddlehead keeps the mark legible without reducing Baxtori to a letter. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" height="256" src="/botanical/brand-fiddlehead.png" width="256" />
    </span>
  );
}

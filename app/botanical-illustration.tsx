type BotanicalIllustrationProps = {
  className?: string;
  priority?: boolean;
  progressMarker?: boolean;
  variant: "crozier" | "frond";
};

const SPECIMENS = {
  crozier: {
    height: 1586,
    src: "/botanical/fern-crozier.webp",
    width: 992,
  },
  frond: {
    height: 1536,
    src: "/botanical/fern-frond.webp",
    width: 1024,
  },
} as const;

export function BotanicalIllustration({
  className,
  priority = false,
  progressMarker = false,
  variant,
}: BotanicalIllustrationProps) {
  const specimen = SPECIMENS[variant];

  return (
    // These are decorative transparent botanical plates. Their intrinsic dimensions
    // keep the oversized edge crop stable before the image has decoded.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      aria-hidden="true"
      className={className}
      data-botanical-bloom={progressMarker || undefined}
      data-botanical-plate={variant === "frond" || undefined}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      height={specimen.height}
      src={specimen.src}
      width={specimen.width}
    />
  );
}

import { cn } from "@/lib/utils";
import { CSSProperties, useState } from "react";

interface LogoMarkProps {
  src: string;
  alt?: string;
  size?: number;
  /** Size of the orbital dot's radius (px). Defaults to size * 0.55. */
  orbitRadius?: number;
  /** Show outer conic halo + orbit (full), subtle glow (soft), or only the exact image (plain). */
  variant?: "full" | "soft" | "plain";
  /** Width override (the image keeps aspect via h-auto on wordmark logos). */
  width?: number;
  height?: number;
  className?: string;
  imgClassName?: string;
}

/**
 * Brand logo wrapper that can frame a PNG/SVG with:
 *  - rotating conic-gradient halo
 *  - counter-rotating inner halo
 *  - thin orange outline ring
 *  - orbiting accent dot
 *  - layered drop-shadow
 */
export function LogoMark({
  src,
  alt = "Logo",
  size = 96,
  orbitRadius,
  variant = "full",
  width,
  height,
  className,
  imgClassName,
}: LogoMarkProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const boxW = width ?? size;
  const boxH = height ?? size;
  const radius = orbitRadius ?? Math.round(Math.max(boxW, boxH) * 0.55);
  const isPlain = variant === "plain";

  const style: CSSProperties = {
    width: boxW,
    height: boxH,
    // CSS var consumed by `.logo-mark__orbit`'s orbit animation
    ["--orbit-radius" as any]: `${radius}px`,
  };

  return (
    <div className={cn("logo-mark", className)} style={style}>
      {!isPlain && variant === "full" && <span className="logo-mark__halo" aria-hidden />}
      {!isPlain && <span className="logo-mark__glow" aria-hidden />}
      {!isPlain && <span className="logo-mark__ring" aria-hidden />}
      {loadFailed ? (
        <div
          className={cn(
            "relative z-10 flex items-center justify-center rounded bg-white px-2 text-black font-black tracking-[0.18em]",
            imgClassName
          )}
          style={{ width: boxW, height: boxH, fontSize: Math.max(12, Math.min(22, boxH * 0.38)) }}
          aria-label={alt}
        >
          TACT
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onError={() => setLoadFailed(true)}
          className={cn(
            "relative z-10 object-contain",
            !isPlain && "drop-shadow-[0_0_16px_rgba(255,107,0,0.55)] [filter:drop-shadow(0_4px_8px_rgba(0,0,0,0.4))_drop-shadow(0_0_16px_rgba(255,107,0,0.55))]",
            imgClassName
          )}
          style={{ width: boxW, height: boxH }}
        />
      )}
      {!isPlain && variant === "full" && <span className="logo-mark__orbit" aria-hidden />}
    </div>
  );
}

export default LogoMark;

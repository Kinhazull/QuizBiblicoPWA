"use client";

import Image from "next/image";
import { useState } from "react";

type GameArtProps = {
  art: string;
  fallback: string;
  className?: string;
  sizes?: string;
};

export function GameArt({ art, fallback, className = "", sizes = "(max-width: 600px) 100vw, 33vw" }: GameArtProps) {
  const [failed, setFailed] = useState(false);
  return <span className={`game-artwork ${failed ? "is-fallback" : ""} ${className}`.trim()} aria-hidden="true">
    {failed ? <span>{fallback}</span> : <Image src={art} alt="" width={420} height={420} sizes={sizes} loading="lazy" unoptimized onError={() => setFailed(true)} />}
  </span>;
}

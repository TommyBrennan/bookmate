"use client";

import { useState } from "react";
import Image from "next/image";

interface BookCoverProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackClassName?: string;
  style?: React.CSSProperties;
}

export default function BookCover({
  src,
  alt,
  width,
  height,
  className = "",
  fallbackClassName = "",
  style,
}: BookCoverProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={
          fallbackClassName ||
          `${className} flex items-center justify-center text-2xl`
        }
        style={{
          width,
          height,
          backgroundColor: "var(--color-border)",
          flexShrink: 0,
          color: "var(--color-text-secondary)",
          ...style,
        }}
        role="img"
        aria-label={`Cover for ${alt}`}
      >
        📖
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      unoptimized
      onError={() => setHasError(true)}
    />
  );
}

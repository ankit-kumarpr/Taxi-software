import Image from "next/image";
import { cn } from "@/lib/utils";

type MediaImageProps = {
  src: string;
  alt?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

/** Prefer native img for local API uploads so Next optimizer/CORS issues don't hide images. */
function isLocalApiUpload(src: string) {
  return (
    src.includes("/uploads/") ||
    src.startsWith("http://localhost") ||
    src.startsWith("http://127.0.0.1") ||
    src.includes("taxi-software.onrender.com")
  );
}

export function MediaImage({
  src,
  alt = "",
  fill,
  width,
  height,
  className,
  priority,
  sizes,
}: MediaImageProps) {
  if (!src) return null;

  if (isLocalApiUpload(src) || fill) {
    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={cn("absolute inset-0 h-full w-full object-cover", className)}
          loading={priority ? "eager" : "lazy"}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={width || 1200}
        height={height || 675}
        className={cn("h-auto w-full object-cover", className)}
        loading={priority ? "eager" : "lazy"}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      priority={priority}
      sizes={sizes}
    />
  );
}

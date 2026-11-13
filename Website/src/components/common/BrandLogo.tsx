import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  href?: string | null;
  onClick?: () => void;
};

export function BrandLogo({
  className,
  imageClassName,
  priority = false,
  href = "/",
  onClick,
}: BrandLogoProps) {
  const image = (
    <Image
      src="/logo.png"
      alt={`${siteConfig.name} logo`}
      width={220}
      height={72}
      priority={priority}
      className={cn("h-10 w-auto object-contain sm:h-12", imageClassName)}
    />
  );

  if (href === null) {
    return <div className={cn("inline-flex items-center", className)}>{image}</div>;
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn("inline-flex items-center", className)}
      aria-label={siteConfig.name}
    >
      {image}
    </Link>
  );
}

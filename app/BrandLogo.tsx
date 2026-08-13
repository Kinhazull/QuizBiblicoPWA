import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  surface?: "dark" | "light";
  variant?: "horizontal" | "symbol";
  priority?: boolean;
  alt?: string;
};

export function BrandLogo({ className = "", surface = "dark", variant = "horizontal", priority = false, alt = "Conte os Feitos" }: BrandLogoProps) {
  const symbol = variant === "symbol";
  const src = symbol ? "/icons/icon-192.png" : surface === "dark" ? "/brand/v2/runtime/logo-on-dark.png" : "/brand/v2/runtime/logo-on-light.png";
  return <Image className={`brand-logo brand-logo-${variant} ${className}`.trim()} src={src} alt={alt} width={symbol ? 192 : 480} height={symbol ? 192 : 206} priority={priority} unoptimized />;
}

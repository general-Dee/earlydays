import Link from "next/link";
import { ReactNode } from "react";

type Variant = "primary" | "clay" | "ghost";

export default function Button({
  href,
  variant = "primary",
  size = "md",
  external = false,
  children,
  className = "",
}: {
  href: string;
  variant?: Variant;
  size?: "md" | "sm";
  external?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const variantClass =
    variant === "primary" ? "btn-primary" : variant === "clay" ? "btn-clay" : "btn-ghost";
  const sizeClass = size === "sm" ? "btn-sm" : "";
  const classes = `btn ${variantClass} ${sizeClass} ${className}`;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

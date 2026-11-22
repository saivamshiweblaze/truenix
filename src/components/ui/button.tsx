import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "accent" | "primary" | "secondary" | "ghost" | "quiet" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-medium select-none transition-[background-color,color,border-color,transform,box-shadow] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  /** TRUEVIX Petrol. Reserve for the single most important action on a screen. */
  accent: "bg-accent text-accent-ink font-semibold hover:bg-accent-hover shadow-[inset_0_-1px_0_rgb(0_0_0/0.18)]",
  /** Ink. Strong actions that are not the screen's main action. */
  primary: "bg-ink text-white hover:bg-charcoal",
  secondary: "bg-paper text-ink border border-line-strong hover:border-ink",
  ghost: "text-charcoal hover:bg-surface hover:text-ink",
  quiet: "text-sub hover:text-ink underline-offset-4 hover:underline",
  /** Destructive confirmations only (inside a confirmation dialog). */
  danger: "bg-danger text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-meta rounded-sm",
  md: "h-10 px-4 text-ui rounded-sm",
  lg: "h-11 px-5 text-ui rounded-sm",
  icon: "h-10 w-10 rounded-sm",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />;
});

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

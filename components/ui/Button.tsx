"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 ring-focus disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950 shadow-soft",
  secondary:
    "bg-ink-100 text-ink-900 hover:bg-ink-200/80 active:bg-ink-200",
  ghost: "text-ink-700 hover:bg-ink-100",
  outline:
    "border border-ink-200 bg-white text-ink-900 hover:bg-ink-50 hover:border-ink-300",
  danger: "bg-danger-500 text-white hover:bg-danger-600",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
};

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type AnchorProps = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

export function Button(props: ButtonProps | AnchorProps) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
    leftIcon,
    rightIcon,
    loading,
  } = props;

  const classes = cn(base, variants[variant], sizes[size], className);

  const content = (
    <>
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        leftIcon
      )}
      {children}
      {rightIcon}
    </>
  );

  if ("href" in props && props.href) {
    const {
      variant: _v,
      size: _s,
      className: _c,
      children: _ch,
      leftIcon: _l,
      rightIcon: _r,
      loading: _ld,
      href,
      ...rest
    } = props;
    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  const {
    variant: _v,
    size: _s,
    className: _c,
    children: _ch,
    leftIcon: _l,
    rightIcon: _r,
    loading: _ld,
    href: _h,
    ...rest
  } = props as ButtonProps;
  return (
    <button className={classes} {...rest}>
      {content}
    </button>
  );
}

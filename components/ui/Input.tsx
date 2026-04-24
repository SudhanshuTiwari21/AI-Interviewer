"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { label, hint, error, leftIcon, rightSlot, className, id, ...props },
    ref,
  ) {
    const reactId = React.useId();
    const inputId = id || props.name || reactId;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-ink-800"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            "group flex h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 transition-all",
            "hover:border-ink-300 focus-within:border-accent-500 focus-within:ring-4 focus-within:ring-accent-500/10",
            error && "border-danger-500 focus-within:ring-danger-500/15",
          )}
        >
          {leftIcon && <span className="text-ink-400">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-full w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400",
              className,
            )}
            {...props}
          />
          {rightSlot}
        </div>
        {(hint || error) && (
          <p
            className={cn(
              "mt-1.5 text-xs",
              error ? "text-danger-600" : "text-ink-500",
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  },
);

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, hint, error, className, id, ...props }, ref) {
    const reactId = React.useId();
    const inputId = id || props.name || reactId;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-ink-800"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "min-h-[120px] w-full rounded-xl border border-ink-200 bg-white p-3 text-sm text-ink-900 outline-none transition-all",
            "hover:border-ink-300 focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10",
            "placeholder:text-ink-400",
            error && "border-danger-500 focus:ring-danger-500/15",
            className,
          )}
          {...props}
        />
        {(hint || error) && (
          <p
            className={cn(
              "mt-1.5 text-xs",
              error ? "text-danger-600" : "text-ink-500",
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  },
);

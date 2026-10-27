import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-xl border border-slate-100 bg-white px-4 text-sm text-ink-800 placeholder:text-slate-400",
          "transition-colors focus:border-violet-400",
          error && "border-red-300 focus:border-red-400",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

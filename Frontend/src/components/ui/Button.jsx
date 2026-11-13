import { forwardRef } from "react";
import { cn } from "../../utils/cn";

const Button = forwardRef(({ className, variant = "default", size = "default", isLoading, children, ...props }, ref) => {
  const baseStyles =
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-[13px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    default: "bg-primary text-white hover:bg-primary-hover shadow-sm",
    destructive: "bg-danger text-white hover:bg-accent-hover shadow-sm",
    outline: "border border-border bg-surface text-navy hover:bg-slate-50",
    secondary: "bg-slate-100 text-navy hover:bg-slate-200",
    ghost: "text-muted hover:bg-slate-100 hover:text-navy",
    link: "text-primary underline-offset-4 hover:underline",
  };

  const sizes = {
    default: "h-8 px-3.5 py-1.5",
    sm: "h-7 rounded-md px-2.5 text-xs",
    lg: "h-9 rounded-lg px-5",
    icon: "h-8 w-8",
  };

  return (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = "Button";

export { Button };

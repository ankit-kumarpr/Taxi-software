import React from "react";
import { cn } from "../../utils/cn";
import { Check } from "lucide-react";

export const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <div className="flex items-center">
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "peer h-3.5 w-3.5 shrink-0 rounded border border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 checked:border-primary checked:bg-primary",
        className
      )}
      {...props}
    />
  </div>
));
Checkbox.displayName = "Checkbox";

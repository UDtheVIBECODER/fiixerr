import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
        secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80",
        ghost: "hover:bg-secondary hover:text-foreground",
        link: "text-[var(--cyan)] underline-offset-4 hover:underline",
        hero: "bg-[var(--cyan)] text-[var(--primary-foreground)] hover:bg-[var(--cyan-glow)]",
        cyan: "bg-[var(--cyan)] text-[var(--primary-foreground)] hover:bg-[var(--cyan-glow)]",
      },
      size: {
        default: "h-12 px-5 py-2",
        sm: "h-10 rounded-md px-3 text-sm",
        lg: "h-14 rounded-md px-8 text-base",
        xl: "h-16 rounded-md px-10 text-lg",
        icon: "h-12 w-12",
        touch: "h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

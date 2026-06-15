import type { ReactNode } from "react";

export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`min-h-dvh w-full mx-auto max-w-md flex flex-col px-5 safe-top pb-8 ${className}`}>
      {children}
    </div>
  );
}

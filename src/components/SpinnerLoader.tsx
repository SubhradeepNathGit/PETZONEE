"use client";

import { Loader2 } from "lucide-react";

export default function SpinnerLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>{text}</span>
      </div>
    </div>
  );
}

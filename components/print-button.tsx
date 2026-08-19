"use client";

import { Printer } from "lucide-react";
import { btnPrimary } from "./ui";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={btnPrimary}>
      <Printer size={16} className="mr-2" />
      {label}
    </button>
  );
}

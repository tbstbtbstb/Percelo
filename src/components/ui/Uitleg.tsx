"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  term: string;
  uitleg: string;
  children: React.ReactNode;
}

export function Uitleg({ term, uitleg, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function sluiten(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", sluiten);
    return () => document.removeEventListener("mousedown", sluiten);
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-expanded={open}
        style={{
          background: "none", border: "none", padding: 0, margin: 0,
          cursor: "pointer", font: "inherit", color: "inherit", fontWeight: "inherit",
          textTransform: "inherit", letterSpacing: "inherit",
          borderBottom: "1px dotted currentColor",
          display: "inline", lineHeight: "inherit",
        }}
      >
        {children}
      </button>

      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 300,
            display: "block",
            backgroundColor: "#161616",
            color: "#f4f4f4",
            padding: "0.75rem 1rem",
            fontSize: "0.8125rem",
            lineHeight: 1.55,
            maxWidth: "min(20rem, calc(100vw - 2rem))",
            minWidth: "11rem",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            whiteSpace: "normal",
            fontWeight: 400,
            textTransform: "none",
            letterSpacing: "normal",
          }}
        >
          <strong style={{
            display: "block",
            fontSize: "0.6875rem", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
            color: "#a8a8a8", marginBottom: "0.375rem",
          }}>
            {term}
          </strong>
          {uitleg}
        </span>
      )}
    </span>
  );
}

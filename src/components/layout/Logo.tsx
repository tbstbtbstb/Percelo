"use client";

type LogoProps = {
  dark?: boolean;
  height?: number;
};

export function Logo({ dark = false, height = 28 }: LogoProps) {
  const mark   = dark ? "#78a9ff" : "#0f62fe";
  const fill   = dark ? "#1a3a5c" : "#dbeeff";
  const pinBg  = dark ? "#161616" : "#ffffff";
  const iconSz = height;
  const textSz = Math.round(height * 0.52);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", lineHeight: 1 }}>
      {/* ── Icoon ── */}
      <svg
        width={iconSz}
        height={iconSz}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <polygon
          points="4,4 38,6 36,40 2,38"
          fill={fill}
          stroke={mark}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line x1="3"  y1="17"   x2="37" y2="18.5" stroke={mark} strokeWidth="1.3" strokeOpacity="0.4" />
        <line x1="21" y1="18.5" x2="20" y2="40"   stroke={mark} strokeWidth="1.3" strokeOpacity="0.3" />
        <circle cx="28" cy="11" r="10"  stroke={mark} strokeWidth="1.2" strokeOpacity="0.22" />
        <circle cx="28" cy="11" r="6.5" fill={mark} />
        <circle cx="28" cy="11" r="2.8" fill={pinBg} />
      </svg>

      {/* ── Woordmerk ── */}
      <span style={{
        fontFamily: "var(--font-ibm-plex-sans), 'IBM Plex Sans', sans-serif",
        fontSize:   `${textSz}px`,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        color: dark ? "#ffffff" : "#161616",
        whiteSpace: "nowrap",
      }}>
        Percelo
      </span>
    </span>
  );
}

"use client";

/**
 * Ilustrasi animasi per role untuk sambutan dashboard.
 * Gaya konsisten dengan identitas EDULALIN (ilustrasi 2D lalu lintas).
 * Menghormati prefers-reduced-motion melalui class ed-anim-*.
 */
export function RoleIllustration({
  role,
  className,
}: {
  role: "ADMIN" | "GURU" | "MURID" | "POLISI";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 320 200"
      role="img"
      aria-label={`Ilustrasi animasi dashboard ${role}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`rd-sky-${role}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
      </defs>

      <rect width="320" height="200" rx="16" fill={`url(#rd-sky-${role})`} />

      {/* Matahari & awan */}
      <circle cx="268" cy="40" r="18" fill="#fbbf24" opacity="0.9" />
      <g className="ed-anim-cloud">
        <ellipse cx="70" cy="34" rx="26" ry="10" fill="#ffffff" opacity="0.9" />
        <ellipse cx="90" cy="29" rx="18" ry="8" fill="#ffffff" opacity="0.9" />
      </g>

      {/* Tanah */}
      <rect x="0" y="150" width="320" height="50" fill="#dcfce7" />
      <rect x="0" y="150" width="320" height="14" fill="#cbd5e1" />
      <line x1="0" y1="157" x2="320" y2="157" stroke="#94a3b8" strokeWidth="3" strokeDasharray="16 14" />

      {role === "ADMIN" && (
        <g>
          {/* Layar monitor */}
          <rect x="96" y="52" width="128" height="84" rx="8" fill="#1e293b" />
          <rect x="104" y="60" width="112" height="68" rx="4" fill="#e2e8f0" />
          <rect x="112" y="68" width="36" height="8" rx="2" fill="#3b82f6" />
          <rect x="112" y="84" width="48" height="8" rx="2" fill="#93c5fd" />
          <rect x="112" y="100" width="56" height="8" rx="2" fill="#cbd5e1" />
          <rect x="176" y="84" width="32" height="24" rx="4" fill="#bfdbfe" />
          <rect x="152" y="136" width="16" height="8" rx="2" fill="#334155" />
          <rect x="120" y="136" width="8" height="14" fill="#334155" />
          <rect x="192" y="136" width="8" height="14" fill="#334155" />
          {/* Admin di depan layar */}
          <rect x="128" y="96" width="26" height="34" rx="6" fill="#1d4ed8" />
          <circle cx="141" cy="84" r="12" fill="#fcd34d" />
          <path d="M127 84 a14 14 0 0 1 28 0 z" fill="#1e293b" />
          <rect x="127" y="80" width="28" height="6" rx="3" fill="#111827" />
          <line x1="134" y1="130" x2="134" y2="150" stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" />
          <line x1="148" y1="130" x2="148" y2="150" stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" />
          <path d="M154 100 L168 92" stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" className="ed-anim-arm" />
        </g>
      )}

      {role === "GURU" && (
        <g>
          {/* Papan tulis */}
          <rect x="40" y="52" width="120" height="84" rx="8" fill="#1e293b" />
          <rect x="48" y="60" width="104" height="68" rx="4" fill="#0f172a" />
          <text x="100" y="88" textAnchor="middle" fontSize="13" fontWeight="700" fill="#ffffff">4 + 4 = ?</text>
          <path d="M64 102 l12 -10 l12 10 M84 108 l8 -18 l8 18" stroke="#fbbf24" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Guru menjelaskan */}
          <rect x="196" y="76" width="30" height="42" rx="6" fill="#7c3aed" />
          <circle cx="211" cy="64" r="13" fill="#fcd34d" />
          <path d="M196 64 a15 15 0 0 1 30 0 z" fill="#1e293b" />
          <line x1="204" y1="118" x2="204" y2="146" stroke="#7c3aed" strokeWidth="6" strokeLinecap="round" />
          <line x1="218" y1="118" x2="218" y2="146" stroke="#7c3aed" strokeWidth="6" strokeLinecap="round" />
          <path d="M226 84 L246 78" stroke="#7c3aed" strokeWidth="6" strokeLinecap="round" className="ed-anim-stop-arm" />
          <circle cx="250" cy="76" r="7" fill="#fcd34d" className="ed-anim-stop-hand" />
          {/* Buku */}
          <rect x="250" y="118" width="30" height="22" rx="4" fill="#ef4444" />
          <line x1="250" y1="124" x2="280" y2="124" stroke="#fca5a5" strokeWidth="2" />
          <line x1="250" y1="132" x2="280" y2="132" stroke="#fca5a5" strokeWidth="2" />
        </g>
      )}

      {role === "MURID" && (
        <g>
          {/* Meja & buku belajar */}
          <rect x="46" y="112" width="96" height="10" rx="3" fill="#b45309" />
          <rect x="58" y="122" width="10" height="28" fill="#92400e" />
          <rect x="120" y="122" width="10" height="28" fill="#92400e" />
          <rect x="60" y="86" width="34" height="26" rx="3" fill="#ef4444" />
          <line x1="60" y1="94" x2="94" y2="94" stroke="#fca5a5" strokeWidth="2" />
          <line x1="60" y1="102" x2="94" y2="102" stroke="#fca5a5" strokeWidth="2" />
          {/* Murid belajar */}
          <rect x="132" y="70" width="28" height="42" rx="6" fill="#2563eb" />
          <circle cx="146" cy="58" r="13" fill="#fcd34d" />
          <path d="M131 58 a15 15 0 0 1 30 0 z" fill="#dc2626" />
          <line x1="139" y1="112" x2="139" y2="150" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" />
          <line x1="153" y1="112" x2="153" y2="150" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" />
          <path d="M160 76 L184 70" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" className="ed-anim-stop-arm" />
          <circle cx="188" cy="68" r="6" fill="#fcd34d" className="ed-anim-stop-hand" />
          {/* Pensil */}
          <line x1="184" y1="76" x2="212" y2="84" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" />
          <path d="M212 84 l8 3 -4 -8 z" fill="#1e293b" />
          {/* Rambu lalu lintas kecil */}
          <g className="ed-anim-sign">
            <rect x="20" y="104" width="5" height="46" fill="#94a3b8" />
            <circle cx="22" cy="92" r="15" fill="#ef4444" stroke="#ffffff" strokeWidth="3" />
            <rect x="14" y="88" width="16" height="6" rx="2" fill="#ffffff" />
          </g>
        </g>
      )}

      {role === "POLISI" && (
        <g>
          {/* Lampu lalu lintas */}
          <g>
            <rect x="52" y="64" width="7" height="86" fill="#94a3b8" />
            <rect x="36" y="30" width="40" height="58" rx="8" fill="#1e293b" />
            <circle cx="56" cy="46" r="9" fill="#ef4444" className="ed-light-red" />
            <circle cx="56" cy="64" r="9" fill="#fbbf24" className="ed-light-yellow" />
            <circle cx="56" cy="82" r="9" fill="#22c55e" className="ed-light-green" />
          </g>
          {/* Zebra cross */}
          <g className="ed-anim-zebra">
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x={120 + i * 14} y="150" width="7" height="50" fill="#ffffff" opacity="0.9" />
            ))}
          </g>
          {/* Polisi */}
          <g className="ed-anim-police">
            <rect x="180" y="74" width="26" height="40" rx="6" fill="#1e293b" />
            <circle cx="193" cy="62" r="12" fill="#fcd34d" />
            <path d="M179 60 a14 14 0 0 1 28 0 z" fill="#1e293b" />
            <rect x="177" y="53" width="32" height="7" rx="3" fill="#111827" />
            <circle cx="205" cy="55" r="2.5" fill="#fbbf24" />
            <line x1="188" y1="114" x2="188" y2="148" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            <line x1="198" y1="114" x2="198" y2="148" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            <path d="M206 82 L230 72" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" className="ed-anim-stop-arm" />
            <circle cx="234" cy="70" r="8" fill="#fcd34d" className="ed-anim-stop-hand" />
            <path d="M180 76 h26 v14 h-26 z" fill="#fbbf24" opacity="0.9" />
            <rect x="180" y="82" width="26" height="5" fill="#fef3c7" />
          </g>
          {/* Anak menyeberang */}
          <g className="ed-anim-walker">
            <rect x="144" y="110" width="18" height="26" rx="5" fill="#dc2626" />
            <circle cx="153" cy="99" r="10" fill="#fcd34d" />
            <path d="M142 98 a11 11 0 0 1 22 0 z" fill="#dc2626" />
            <line x1="148" y1="136" x2="148" y2="150" stroke="#334155" strokeWidth="6" strokeLinecap="round" className="ed-anim-walk-leg-a" />
            <line x1="158" y1="136" x2="158" y2="150" stroke="#334155" strokeWidth="6" strokeLinecap="round" className="ed-anim-walk-leg-b" />
            <rect x="128" y="112" width="15" height="22" rx="4" fill="#7c3aed" />
          </g>
        </g>
      )}
    </svg>
  );
}

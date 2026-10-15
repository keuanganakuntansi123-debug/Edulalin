"use client";

/**
 * Ilustrasi animasi edukasi lalu lintas untuk halaman Login/Registrasi.
 * Menggunakan gaya yang konsisten dengan HeroAnimation publik & prefer-reduced-motion.
 */
export function AuthIllustration({ variant = "signin" }: { variant?: "signin" | "register" }) {
  return (
    <svg
      viewBox="0 0 480 360"
      role="img"
      aria-label="Ilustrasi animasi edukasi lalu lintas"
      className="h-auto w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ai-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="ai-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      <rect width="480" height="360" fill="url(#ai-sky)" />

      {/* Matahari */}
      <circle cx="408" cy="56" r="26" fill="#fbbf24" opacity="0.9" />
      <circle cx="408" cy="56" r="36" fill="#fbbf24" opacity="0.2" />

      {/* Awan */}
      <g className="ed-anim-cloud">
        <ellipse cx="120" cy="60" rx="38" ry="14" fill="#ffffff" opacity="0.85" />
        <ellipse cx="146" cy="53" rx="26" ry="11" fill="#ffffff" opacity="0.85" />
        <ellipse cx="94" cy="56" rx="20" ry="9" fill="#ffffff" opacity="0.85" />
      </g>

      {/* Rambu lalu lintas */}
      <g className="ed-anim-sign">
        <rect x="58" y="150" width="7" height="110" fill="#94a3b8" />
        <circle cx="61" cy="130" r="30" fill="#ef4444" stroke="#ffffff" strokeWidth="5" />
        <rect x="49" y="122" width="24" height="7" rx="3" fill="#ffffff" />
        <rect x="55" y="118" width="12" height="15" rx="3" fill="#ffffff" />
      </g>

      {/* Gedung sekolah */}
      <g>
        <rect x="230" y="110" width="150" height="120" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="230" y="110" width="150" height="30" rx="8" fill="#f59e0b" />
        <text x="305" y="131" textAnchor="middle" fontSize="15" fontWeight="700" fill="#ffffff">SEKOLAH</text>
        <rect x="258" y="152" width="30" height="30" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2" />
        <rect x="300" y="152" width="30" height="30" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2" />
        <rect x="342" y="152" width="30" height="30" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2" />
        <rect x="272" y="198" width="66" height="32" rx="4" fill="#b45309" />
      </g>

      {/* Trotoar & jalan */}
      <rect x="0" y="230" width="480" height="30" fill="#e2e8f0" />
      <rect x="0" y="260" width="480" height="100" fill="url(#ai-road)" />
      <line x1="0" y1="310" x2="480" y2="310" stroke="#e2e8f0" strokeWidth="3" strokeDasharray="24 20" />

      {/* Zebra cross */}
      <g className="ed-anim-zebra">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={180 + i * 15} y="260" width="8" height="100" fill="#ffffff" opacity="0.85" />
        ))}
      </g>

      {/* Lampu lalu lintas */}
      <g>
        <rect x="412" y="150" width="9" height="110" fill="#94a3b8" />
        <rect x="394" y="96" width="46" height="78" rx="10" fill="#1e293b" />
        <circle cx="417" cy="118" r="11" fill="#ef4444" className="ed-light-red" />
        <circle cx="417" cy="142" r="11" fill="#fbbf24" className="ed-light-yellow" />
        <circle cx="417" cy="166" r="11" fill="#22c55e" className="ed-light-green" />
      </g>

      {variant === "signin" ? (
        <g>
          {/* Anak sekolah dengan helm */}
          <g className="ed-anim-walker">
            <rect x="150" y="206" width="22" height="34" rx="6" fill="#3b82f6" />
            <circle cx="161" cy="192" r="13" fill="#fcd34d" />
            <path d="M148 190 a13 13 0 0 1 26 0 z" fill="#ef4444" />
            <path d="M150 186 a13 13 0 0 1 24 0" fill="none" stroke="#ffffff" strokeWidth="2.5" />
            <line x1="155" y1="240" x2="155" y2="262" stroke="#334155" strokeWidth="7" strokeLinecap="round" className="ed-anim-walk-leg-a" />
            <line x1="167" y1="240" x2="167" y2="262" stroke="#334155" strokeWidth="7" strokeLinecap="round" className="ed-anim-walk-leg-b" />
            <path d="M172 214 L188 206" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" className="ed-anim-walk-arm" />
            <rect x="128" y="208" width="20" height="28" rx="5" fill="#7c3aed" />
            <path d="M130 214 q4 -12 16 -12" fill="none" stroke="#7c3aed" strokeWidth="3" />
          </g>
          {/* Mobil berhenti */}
          <g className="ed-anim-car">
            <rect x="330" y="212" width="120" height="40" rx="12" fill="#0ea5e9" />
            <path d="M356 212 q8 -16 28 -16 h28 q16 0 22 16 z" fill="#38bdf8" />
            <rect x="354" y="202" width="24" height="14" rx="4" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2" />
            <rect x="392" y="202" width="24" height="14" rx="4" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2" />
            <circle cx="360" cy="256" r="14" fill="#1e293b" />
            <circle cx="360" cy="256" r="6" fill="#94a3b8" />
            <circle cx="422" cy="256" r="14" fill="#1e293b" />
            <circle cx="422" cy="256" r="6" fill="#94a3b8" />
            <rect x="358" y="216" width="8" height="4" fill="#ffffff" className="ed-anim-blinker" />
          </g>
        </g>
      ) : (
        <g>
          {/* Anak bersepeda */}
          <g className="ed-anim-rider">
            <g className="ed-anim-bike">
              <path d="M150 240 L180 228 L206 240 M180 228 L176 260 M176 260 L150 240 M176 260 L206 240" fill="none" stroke="#0ea5e9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="180" y1="228" x2="206" y2="206" stroke="#0ea5e9" strokeWidth="5" strokeLinecap="round" />
              <g className="ed-anim-wheel">
                <circle cx="150" cy="260" r="22" fill="none" stroke="#334155" strokeWidth="5" />
                <circle cx="150" cy="260" r="5" fill="#94a3b8" />
                <line x1="150" y1="238" x2="150" y2="282" stroke="#334155" strokeWidth="3" />
                <line x1="128" y1="260" x2="172" y2="260" stroke="#334155" strokeWidth="3" />
              </g>
              <g className="ed-anim-wheel ed-anim-wheel-rev">
                <circle cx="236" cy="260" r="22" fill="none" stroke="#334155" strokeWidth="5" />
                <circle cx="236" cy="260" r="5" fill="#94a3b8" />
                <line x1="236" y1="238" x2="236" y2="282" stroke="#334155" strokeWidth="3" />
                <line x1="214" y1="260" x2="258" y2="260" stroke="#334155" strokeWidth="3" />
              </g>
              <line x1="206" y1="206" x2="202" y2="196" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
              <path d="M196 196 h24" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" />
            </g>
            <rect x="176" y="196" width="20" height="32" rx="8" fill="#ef4444" />
            <path d="M196 200 L210 196" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" className="ed-anim-arm" />
            <path d="M180 224 L188 242 L180 248" fill="none" stroke="#f97316" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="ed-anim-leg" />
            <circle cx="190" cy="182" r="13" fill="#fcd34d" />
            <path d="M177 182 a13 13 0 0 1 26 0 z" fill="#fbbf24" />
            <path d="M179 178 a13 13 0 0 1 24 0" fill="none" stroke="#ffffff" strokeWidth="2.5" />
          </g>
          {/* Polisi memberi isyarat */}
          <g className="ed-anim-police">
            <rect x="330" y="208" width="24" height="40" rx="6" fill="#1e293b" />
            <circle cx="342" cy="196" r="12" fill="#fcd34d" />
            <path d="M328 194 a14 14 0 0 1 28 0 z" fill="#1e293b" />
            <rect x="326" y="186" width="32" height="8" rx="3" fill="#111827" />
            <line x1="337" y1="248" x2="337" y2="262" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            <line x1="347" y1="248" x2="347" y2="262" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
            <path d="M354 214 L380 204" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" className="ed-anim-stop-arm" />
            <circle cx="384" cy="202" r="8" fill="#fcd34d" className="ed-anim-stop-hand" />
            <path d="M330 210 h24 v14 h-24 z" fill="#fbbf24" opacity="0.9" />
            <rect x="330" y="216" width="24" height="5" fill="#fef3c7" />
          </g>
        </g>
      )}
    </svg>
  );
}

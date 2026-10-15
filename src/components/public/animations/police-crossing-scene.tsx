/**
 * Animasi "Polisi Membantu Anak Sekolah Menyeberang" — ilustrasi vektor 2D.
 * Elemen: polisi memberi isyarat, anak sekolah berjalan di zebra cross,
 * lampu lalu lintas berubah, kendaraan berhenti, seragam & tas sekolah,
 * suasana jalan di sekitar sekolah Indonesia.
 */

export function PoliceCrossingScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 720 420"
      role="img"
      aria-label="Ilustrasi animasi polisi lalu lintas membantu anak sekolah menyeberang di zebra cross"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="60%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#fef9c3" />
        </linearGradient>
        <linearGradient id="pc-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="pc-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
      </defs>

      <rect width="720" height="420" fill="url(#pc-sky)" />

      {/* Matahari */}
      <circle cx="92" cy="70" r="32" fill="#fbbf24" opacity="0.9" />
      <circle cx="92" cy="70" r="42" fill="#fbbf24" opacity="0.22" />

      {/* Awan */}
      <g className="ed-anim-cloud">
        <ellipse cx="430" cy="60" rx="40" ry="15" fill="#ffffff" opacity="0.9" />
        <ellipse cx="458" cy="53" rx="28" ry="12" fill="#ffffff" opacity="0.9" />
        <ellipse cx="404" cy="56" rx="22" ry="10" fill="#ffffff" opacity="0.9" />
      </g>
      <g className="ed-anim-cloud ed-anim-cloud-2">
        <ellipse cx="600" cy="110" rx="32" ry="12" fill="#ffffff" opacity="0.8" />
      </g>

      {/* Pagar sekolah */}
      <g>
        <rect x="0" y="150" width="720" height="4" fill="#94a3b8" />
        <rect x="0" y="150" width="720" height="70" fill="none" />
        {Array.from({ length: 25 }).map((_, i) => (
          <line key={i} x1={i * 30 + 8} y1="150" x2={i * 30 + 8} y2="220" stroke="#94a3b8" strokeWidth="4" />
        ))}
        <line x1="0" y1="220" x2="720" y2="220" stroke="#94a3b8" strokeWidth="4" />
        <rect x="600" y="180" width="70" height="40" rx="4" fill="#ef4444" />
        <text x="635" y="206" textAnchor="middle" fontSize="15" fontWeight="700" fill="#ffffff">TK</text>
        <rect x="660" y="180" width="60" height="40" rx="4" fill="#0ea5e9" />
        <text x="690" y="206" textAnchor="middle" fontSize="15" fontWeight="700" fill="#ffffff">SD</text>
      </g>

      {/* Gedung sekolah di belakang */}
      <rect x="16" y="120" width="130" height="100" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="16" y="120" width="130" height="30" rx="6" fill="#f59e0b" />
      <text x="81" y="142" textAnchor="middle" fontSize="14" fontWeight="700" fill="#ffffff">SEKOLAH</text>
      <rect x="40" y="164" width="26" height="26" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2" />
      <rect x="94" y="164" width="26" height="26" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2" />
      <rect x="56" y="196" width="50" height="24" rx="3" fill="#b45309" />

      {/* Lampu lalu lintas */}
      <g>
        <rect x="340" y="196" width="9" height="104" fill="#94a3b8" />
        <rect x="322" y="140" width="46" height="80" rx="10" fill="#1e293b" />
        <circle cx="345" cy="162" r="12" fill="#ef4444" className="ed-light-red" />
        <circle cx="345" cy="186" r="12" fill="#fbbf24" className="ed-light-yellow" />
        <circle cx="345" cy="210" r="12" fill="#22c55e" className="ed-light-green" />
      </g>

      {/* Trotoar & rumput */}
      <rect x="0" y="300" width="720" height="34" fill="#e2e8f0" />
      <rect x="0" y="334" width="720" height="86" fill="url(#pc-grass)" />

      {/* Jalan */}
      <rect x="0" y="300" width="720" height="64" fill="url(#pc-road)" />
      <line x1="0" y1="332" x2="720" y2="332" stroke="#e2e8f0" strokeWidth="3" strokeDasharray="26 22" />

      {/* Zebra cross */}
      <g>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={330 + i * 16} y="300" width="8" height="64" fill="#ffffff" opacity="0.85" />
        ))}
      </g>

      {/* Kendaraan berhenti di zebra */}
      <g className="ed-anim-car">
        {/* Mobil */}
        <rect x="30" y="248" width="130" height="44" rx="12" fill="#f59e0b" />
        <path d="M58 248 q8 -18 30 -18 h30 q18 0 24 18 z" fill="#fbbf24" />
        <rect x="56" y="236" width="26" height="16" rx="4" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2" />
        <rect x="96" y="236" width="26" height="16" rx="4" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2" />
        <circle cx="62" cy="296" r="16" fill="#1e293b" />
        <circle cx="62" cy="296" r="7" fill="#94a3b8" />
        <circle cx="128" cy="296" r="16" fill="#1e293b" />
        <circle cx="128" cy="296" r="7" fill="#94a3b8" />
        <rect x="60" y="252" width="8" height="4" fill="#ffffff" className="ed-anim-blinker" />
      </g>

      {/* Polisi */}
      <g className="ed-anim-police">
        {/* Badan */}
        <rect x="470" y="238" width="26" height="42" rx="6" fill="#1e293b" />
        {/* Kepala */}
        <circle cx="483" cy="224" r="13" fill="#fcd34d" />
        {/* Topi */}
        <path d="M468 222 a15 15 0 0 1 30 0 z" fill="#1e293b" />
        <rect x="466" y="214" width="34" height="8" rx="3" fill="#111827" />
        <circle cx="498" cy="216" r="3" fill="#fbbf24" />
        {/* Kaki */}
        <line x1="478" y1="280" x2="478" y2="300" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
        <line x1="488" y1="280" x2="488" y2="300" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
        {/* Lengan isyarat berhenti */}
        <path d="M496 248 L528 236" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" className="ed-anim-stop-arm" />
        <path d="M470 248 L450 236" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
        {/* Telapak isyarat */}
        <circle cx="532" cy="234" r="9" fill="#fcd34d" className="ed-anim-stop-hand" />
        {/* Rompi reflektif */}
        <path d="M470 240 h26 v14 h-26 z" fill="#fbbf24" opacity="0.9" />
        <rect x="470" y="246" width="26" height="5" fill="#fef3c7" />
        <rect x="470" y="254" width="26" height="5" fill="#fef3c7" />
      </g>

      {/* Anak sekolah menyeberang */}
      <g className="ed-anim-kids">
        {/* Anak 1 */}
        <g className="ed-anim-walker">
          <rect x="404" y="252" width="20" height="30" rx="5" fill="#dc2626" />
          <circle cx="414" cy="240" r="11" fill="#fcd34d" />
          <path d="M402 238 a12 12 0 0 1 24 0 z" fill="#dc2626" />
          <line x1="408" y1="282" x2="408" y2="302" stroke="#334155" strokeWidth="6" strokeLinecap="round" className="ed-anim-walk-leg-a" />
          <line x1="420" y1="282" x2="420" y2="302" stroke="#334155" strokeWidth="6" strokeLinecap="round" className="ed-anim-walk-leg-b" />
          <path d="M424 258 L440 250" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" className="ed-anim-walk-arm" />
          {/* Tas */}
          <rect x="384" y="252" width="18" height="24" rx="4" fill="#7c3aed" />
          <path d="M386 258 q4 -10 14 -10" fill="none" stroke="#7c3aed" strokeWidth="3" />
        </g>
        {/* Anak 2 */}
        <g className="ed-anim-walker ed-anim-walker-2">
          <rect x="372" y="256" width="18" height="28" rx="5" fill="#2563eb" />
          <circle cx="381" cy="244" r="10" fill="#fcd34d" />
          <path d="M370 242 a11 11 0 0 1 22 0 z" fill="#2563eb" />
          <line x1="375" y1="284" x2="375" y2="302" stroke="#334155" strokeWidth="6" strokeLinecap="round" className="ed-anim-walk-leg-b" />
          <line x1="387" y1="284" x2="387" y2="302" stroke="#334155" strokeWidth="6" strokeLinecap="round" className="ed-anim-walk-leg-a" />
          <rect x="358" y="256" width="16" height="22" rx="4" fill="#16a34a" />
        </g>
      </g>

      {/* Semak */}
      <circle cx="600" cy="330" r="18" fill="#86efac" />
      <circle cx="624" cy="338" r="14" fill="#4ade80" />
    </svg>
  );
}

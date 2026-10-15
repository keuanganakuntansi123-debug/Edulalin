/**
 * Animasi "Anak Bersepeda" — ilustrasi vektor 2D modern.
 * Elemen: anak memakai helm mengayuh sepeda, roda berputar, rambu lalu lintas,
 * marka jalan & zebra cross, pepohonan dan lingkungan sekolah sebagai latar.
 * Menggunakan CSS animation yang di-disable pada prefers-reduced-motion.
 */

export function BicycleScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 720 420"
      role="img"
      aria-label="Ilustrasi animasi anak bersepeda dengan helm di lingkungan jalan yang aman"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="60%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#fef9c3" />
        </linearGradient>
        <linearGradient id="bs-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="bs-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
      </defs>

      {/* Langit */}
      <rect width="720" height="420" fill="url(#bs-sky)" />

      {/* Matahari */}
      <circle cx="600" cy="72" r="34" fill="#fbbf24" opacity="0.9" />
      <circle cx="600" cy="72" r="44" fill="#fbbf24" opacity="0.25" />

      {/* Awan */}
      <g className="ed-anim-cloud">
        <ellipse cx="120" cy="70" rx="42" ry="16" fill="#ffffff" opacity="0.9" />
        <ellipse cx="150" cy="62" rx="30" ry="13" fill="#ffffff" opacity="0.9" />
        <ellipse cx="92" cy="66" rx="24" ry="11" fill="#ffffff" opacity="0.9" />
      </g>
      <g className="ed-anim-cloud ed-anim-cloud-2">
        <ellipse cx="420" cy="52" rx="36" ry="13" fill="#ffffff" opacity="0.8" />
        <ellipse cx="448" cy="46" rx="26" ry="11" fill="#ffffff" opacity="0.8" />
      </g>

      {/* Gedung sekolah */}
      <g>
        <rect x="28" y="150" width="120" height="150" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="28" y="150" width="120" height="34" rx="6" fill="#ef4444" />
        <text x="88" y="174" textAnchor="middle" fontSize="16" fontWeight="700" fill="#ffffff">SEKOLAH</text>
        <rect x="56" y="200" width="30" height="30" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2" />
        <rect x="96" y="200" width="30" height="30" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2" />
        <rect x="66" y="248" width="46" height="52" rx="3" fill="#b45309" />
        <rect x="30" y="146" width="8" height="14" fill="#fbbf24" />
        <path d="M88 120 L88 150" stroke="#94a3b8" strokeWidth="3" />
        <rect x="80" y="104" width="16" height="18" fill="#ef4444" />
        <circle cx="78" cy="138" r="3" fill="#ef4444" />
      </g>

      {/* Pepohonan */}
      <g>
        <rect x="196" y="200" width="14" height="100" fill="#92400e" />
        <circle cx="203" cy="182" r="34" fill="#22c55e" />
        <circle cx="188" cy="192" r="22" fill="#4ade80" />
        <circle cx="220" cy="192" r="22" fill="#16a34a" />
      </g>
      <g>
        <rect x="636" y="206" width="12" height="94" fill="#92400e" />
        <circle cx="642" cy="188" r="30" fill="#16a34a" />
        <circle cx="626" cy="198" r="20" fill="#4ade80" />
        <circle cx="658" cy="196" r="20" fill="#22c55e" />
      </g>

      {/* Trotoar & rumput */}
      <rect x="0" y="300" width="720" height="34" fill="#e2e8f0" />
      <rect x="0" y="334" width="720" height="86" fill="url(#bs-grass)" />

      {/* Jalan */}
      <rect x="0" y="300" width="720" height="64" fill="url(#bs-road)" />
      <line x1="0" y1="332" x2="720" y2="332" stroke="#e2e8f0" strokeWidth="3" strokeDasharray="26 22" />

      {/* Marka zebra cross */}
      <g className="ed-anim-zebra">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={320 + i * 16} y="300" width="8" height="64" fill="#ffffff" opacity="0.85" />
        ))}
      </g>

      {/* Rambu lalu lintas */}
      <g className="ed-anim-sign">
        <rect x="152" y="210" width="6" height="90" fill="#94a3b8" />
        <path d="M155 210 l26 -26 l26 26 z" fill="#ef4444" stroke="#ffffff" strokeWidth="3" />
        <path d="M155 210 l26 -26 l26 26 z" fill="none" stroke="#ffffff" strokeWidth="3" />
        <rect x="160" y="216" width="4" height="4" fill="#ffffff" />
        <rect x="172" y="216" width="4" height="4" fill="#ffffff" />
        <rect x="184" y="216" width="4" height="4" fill="#ffffff" />
      </g>

      {/* Lampu lalu lintas */}
      <g className="ed-anim-traffic-light">
        <rect x="572" y="170" width="10" height="130" fill="#94a3b8" />
        <rect x="554" y="112" width="46" height="84" rx="10" fill="#1e293b" />
        <circle cx="577" cy="134" r="12" fill="#ef4444" className="ed-light-red" />
        <circle cx="577" cy="158" r="12" fill="#fbbf24" className="ed-light-yellow" />
        <circle cx="577" cy="182" r="12" fill="#22c55e" className="ed-light-green" />
      </g>

      {/* Pengendara sepeda */}
      <g className="ed-anim-rider">
        {/* Sepeda */}
        <g className="ed-anim-bike">
          {/* Rangka */}
          <path d="M360 290 L392 276 L420 290 M392 276 L388 310 M388 310 L360 290 M388 310 L420 290" fill="none" stroke="#0ea5e9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="392" y1="276" x2="420" y2="252" stroke="#0ea5e9" strokeWidth="5" strokeLinecap="round" />
          <line x1="420" y1="252" x2="452" y2="252" stroke="#0ea5e9" strokeWidth="5" strokeLinecap="round" />
          <line x1="420" y1="290" x2="452" y2="252" stroke="#0ea5e9" strokeWidth="5" strokeLinecap="round" />
          {/* Roda */}
          <g className="ed-anim-wheel">
            <circle cx="360" cy="310" r="24" fill="none" stroke="#334155" strokeWidth="5" />
            <circle cx="360" cy="310" r="6" fill="#94a3b8" />
            <line x1="360" y1="286" x2="360" y2="334" stroke="#334155" strokeWidth="3" />
            <line x1="336" y1="310" x2="384" y2="310" stroke="#334155" strokeWidth="3" />
          </g>
          <g className="ed-anim-wheel ed-anim-wheel-rev">
            <circle cx="452" cy="310" r="24" fill="none" stroke="#334155" strokeWidth="5" />
            <circle cx="452" cy="310" r="6" fill="#94a3b8" />
            <line x1="452" y1="286" x2="452" y2="334" stroke="#334155" strokeWidth="3" />
            <line x1="428" y1="310" x2="476" y2="310" stroke="#334155" strokeWidth="3" />
          </g>
          {/* Pedal */}
          <g className="ed-anim-pedal">
            <circle cx="392" cy="276" r="5" fill="#475569" />
            <line x1="392" y1="276" x2="382" y2="292" stroke="#334155" strokeWidth="3" />
            <rect x="376" y="290" width="12" height="5" rx="2" fill="#334155" />
          </g>
          {/* Setang */}
          <line x1="420" y1="252" x2="414" y2="240" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
          <line x1="452" y1="252" x2="452" y2="242" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
          <path d="M410 240 h34" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* Anak */}
        <g>
          {/* Kaki */}
          <path d="M390 268 L396 288 L386 294" fill="none" stroke="#fb923c" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="ed-anim-leg" />
          {/* Badan */}
          <rect x="384" y="238" width="22" height="34" rx="8" fill="#3b82f6" />
          {/* Lengan */}
          <path d="M406 244 L420 240" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" className="ed-anim-arm" />
          {/* Kepala */}
          <circle cx="400" cy="222" r="14" fill="#fcd34d" />
          {/* Helm */}
          <path d="M384 222 a16 16 0 0 1 32 0 z" fill="#ef4444" />
          <path d="M384 218 a16 16 0 0 1 32 0" fill="none" stroke="#ffffff" strokeWidth="3" />
          <rect x="395" y="204" width="10" height="6" rx="2" fill="#b91c1c" />
        </g>
      </g>

      {/* Angin/buih gerakan */}
      <g className="ed-anim-wind">
        <path d="M500 250 q8 -6 16 0 q8 6 16 0" fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      </g>

      {/* Semak */}
      <circle cx="520" cy="330" r="18" fill="#86efac" />
      <circle cx="540" cy="336" r="14" fill="#4ade80" />
    </svg>
  );
}

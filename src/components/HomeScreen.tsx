import React, { useMemo, useState } from 'react';
import { ArrowLeft, Grid3x3, Play, RotateCcw } from 'lucide-react';
import { ELEMENTS_118 } from '../data/elements';
import { CATEGORY_META_BY_ID } from '../data/categories';
import { ChemicalElement } from '../types/game';

export interface SavedSessionSummary {
  activeTeamName: string;
  teamCount: number;
  updatedAt: number;
}

export interface HomeScreenProps {
  onPlay: () => void;
  onNewGame: () => void;
  onOpenResearchLab: () => void;
  onBack?: () => void;
  savedSession: SavedSessionSummary | null;
}

const SHELL_LETTERS = ['K', 'L', 'M', 'N', 'O', 'P'] as const;

const BUBBLES = [
  { cx: 92, cy: 204, r: 4.5, duration: '2.4s', delay: '0s' },
  { cx: 112, cy: 212, r: 6.0, duration: '3.1s', delay: '0.5s' },
  { cx: 128, cy: 198, r: 3.8, duration: '2.2s', delay: '1.1s' },
  { cx: 102, cy: 218, r: 5.0, duration: '2.9s', delay: '1.6s' },
  { cx: 118, cy: 206, r: 3.4, duration: '2.5s', delay: '0.8s' },
  { cx: 84, cy: 214, r: 4.2, duration: '3.3s', delay: '1.9s' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlay,
  onNewGame,
  onOpenResearchLab,
  onBack,
  savedSession,
}) => {
  const tungsten = useMemo<ChemicalElement>(() => {
    return (
      ELEMENTS_118.find((el) => el.atomicNumber === 74) ??
      ELEMENTS_118[73] ??
      ELEMENTS_118[0]
    );
  }, []);

  const tungstenShells = useMemo(() => {
    const shells = tungsten.electronShells?.length
      ? tungsten.electronShells
      : [2, 8, 18, 32, 12, 2];
    return shells.map((electrons, idx) => ({
      index: idx,
      letter: SHELL_LETTERS[idx] ?? `S${idx + 1}`,
      electrons,
      radius: 42 + idx * 24,
      durationSec: 16 + idx * 7,
      clockwise: idx % 2 === 0,
      isValence: idx === shells.length - 1,
    }));
  }, [tungsten]);

  const [selectedShellIndex, setSelectedShellIndex] = useState<number>(
    Math.max(0, tungstenShells.length - 1)
  );
  const [hoveredElement, setHoveredElement] = useState<ChemicalElement>(tungsten);
  const [flaskSwirlActive, setFlaskSwirlActive] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(false);

  const handleBackReset = () => {
    setSelectedShellIndex(Math.max(0, tungstenShells.length - 1));
    setHoveredElement(tungsten);
    setFlaskSwirlActive(false);
    setResetFeedback(true);
    window.setTimeout(() => setResetFeedback(false), 1400);
    onBack?.();
  };

  const activeShell = tungstenShells[selectedShellIndex] ?? tungstenShells[tungstenShells.length - 1];
  const hoveredCategory = hoveredElement.category
    ? CATEGORY_META_BY_ID[hoveredElement.category]
    : undefined;

  const positionedElements = useMemo(() => {
    return ELEMENTS_118.map((el) => {
      let col = el.groupNumber ?? 1;
      let row = el.period ?? 1;
      if (el.atomicNumber >= 57 && el.atomicNumber <= 71) {
        row = 9;
        col = el.atomicNumber - 57 + 4;
      } else if (el.atomicNumber >= 89 && el.atomicNumber <= 103) {
        row = 10;
        col = el.atomicNumber - 89 + 4;
      }
      return { el, col, row };
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#09090D] text-[#F4F1EA] flex flex-col justify-between relative overflow-hidden">
      {/* Subtle laboratory radial depth backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 18% 55%, rgba(255, 135, 51, 0.08), transparent 42%), radial-gradient(circle at 84% 52%, rgba(112, 41, 255, 0.14), transparent 45%), radial-gradient(circle at 50% 42%, rgba(40, 107, 255, 0.07), transparent 48%)',
        }}
      />

      {/* Top Bar with mandatory top-left Back button */}
      <header className="relative z-20 w-full max-w-[1440px] mx-auto px-5 sm:px-8 pt-5 pb-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackReset}
            title="Reset homescreen visual state"
            aria-label="Back / Reset homescreen view"
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#171820] border border-white/15 hover:border-[#286BFF] hover:bg-[#20222D] text-xs sm:text-sm font-semibold text-[#F4F1EA] flex items-center gap-2 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#286BFF] whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[#A6A9B7] shrink-0" />
            <span>Back</span>
          </button>
          {resetFeedback && (
            <span className="text-xs font-mono text-[#32C48D] whitespace-nowrap">
              View reset
            </span>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-[#A6A9B7] tabular-nums">
          <span>Research Edition</span>
          <span aria-hidden="true">·</span>
          <span>118 Elements</span>
          <span aria-hidden="true">·</span>
          <span>130-Tile 3D Board</span>
        </div>
      </header>

      {/* Main 3-Column Stage: Left Tungsten Bohr | Center Title + Play + Footer | Right Tilted Ptable + Purple Flask */}
      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-5 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-6">
        {/* LEFT ZONE: Tungsten (W, Z=74) Bohr Shell Model */}
        <section
          aria-label="Tungsten Bohr atomic shell model"
          className="lg:col-span-4 order-2 lg:order-1 flex flex-col items-center justify-center gap-4"
        >
          <div className="relative w-full max-w-[360px] aspect-square flex items-center justify-center">
            <svg
              viewBox="0 0 360 360"
              className="w-full h-full overflow-visible select-none"
              role="img"
              aria-label={`Bohr shell model of ${tungsten.nameEn} (${tungsten.symbol}, Z=${tungsten.atomicNumber})`}
            >
              <defs>
                <radialGradient id="tungstenNucleusGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFAE52" stopOpacity="0.95" />
                  <stop offset="55%" stopColor="#FF7800" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#286BFF" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="tungstenCore" cx="38%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#FFD28E" />
                  <stop offset="55%" stopColor="#FF8733" />
                  <stop offset="100%" stopColor="#B84B0A" />
                </radialGradient>
              </defs>

              {/* Soft nucleus ambient glow */}
              <circle cx="180" cy="180" r="46" fill="url(#tungstenNucleusGlow)" />

              {/* 6 Bohr Electron Shells: K(2), L(8), M(18), N(32), O(12), P(2) */}
              {tungstenShells.map((shell) => {
                const isSelected = activeShell?.index === shell.index;
                const strokeColor = isSelected
                  ? '#FF8733'
                  : shell.isValence
                  ? 'rgba(255, 135, 51, 0.55)'
                  : 'rgba(147, 197, 253, 0.24)';

                return (
                  <g key={shell.letter}>
                    <circle
                      cx="180"
                      cy="180"
                      r={shell.radius}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 2 : 1.15}
                      strokeDasharray={shell.isValence && !isSelected ? '4 4' : undefined}
                      className="cursor-pointer transition-colors duration-150"
                      onClick={() => setSelectedShellIndex(shell.index)}
                      onMouseEnter={() => setSelectedShellIndex(shell.index)}
                    />

                    {/* Rotating electron group */}
                    <g
                      className={shell.clockwise ? 'ptm-orbit-cw' : 'ptm-orbit-ccw'}
                      style={
                        {
                          '--orbit-duration': `${shell.durationSec}s`,
                          transformOrigin: '180px 180px',
                        } as React.CSSProperties
                      }
                    >
                      {Array.from({ length: shell.electrons }).map((_, eIdx) => {
                        const angle = (eIdx / shell.electrons) * Math.PI * 2;
                        const ex = 180 + Math.cos(angle) * shell.radius;
                        const ey = 180 + Math.sin(angle) * shell.radius;
                        const electronFill = isSelected
                          ? '#FF8733'
                          : shell.isValence
                          ? '#FFB36B'
                          : '#60A5FA';

                        return (
                          <circle
                            key={`${shell.letter}-${eIdx}`}
                            cx={ex}
                            cy={ey}
                            r={isSelected ? 3.5 : shell.isValence ? 3.2 : 2.25}
                            fill={electronFill}
                            opacity={isSelected ? 1 : 0.88}
                          />
                        );
                      })}
                    </g>
                  </g>
                );
              })}

              {/* Tungsten Nucleus */}
              <circle
                cx="180"
                cy="180"
                r="22"
                fill="url(#tungstenCore)"
                stroke="#FFE0B5"
                strokeWidth="1.2"
              />
              <text
                x="180"
                y="178"
                textAnchor="middle"
                fill="#09090D"
                fontFamily="Outfit, sans-serif"
                fontSize="15"
                fontWeight="800"
              >
                W
              </text>
              <text
                x="180"
                y="192"
                textAnchor="middle"
                fill="#09090D"
                fontFamily="JetBrains Mono, monospace"
                fontSize="9"
                fontWeight="700"
              >
                74
              </text>
            </svg>
          </div>

          {/* Interactive Shell Strip & Unboxed Atomic Metadata */}
          <div className="w-full max-w-[360px] space-y-2.5 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#A6A9B7] tabular-nums">
              <span className="text-[#F4F1EA] font-semibold">
                {tungsten.atomicNumber} {tungsten.symbol} · {tungsten.nameEn}
              </span>
              <span aria-hidden="true">·</span>
              <span>{tungsten.atomicMassDisplay} u</span>
            </div>

            <div
              role="group"
              aria-label="Tungsten electron shell selector"
              className="grid grid-cols-6 gap-1.5"
            >
              {tungstenShells.map((shell) => {
                const selected = activeShell?.index === shell.index;
                return (
                  <button
                    key={shell.letter}
                    type="button"
                    onClick={() => setSelectedShellIndex(shell.index)}
                    className={`py-1.5 px-1 rounded-lg border text-[11px] font-mono tabular-nums cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#FF8733] ${
                      selected
                        ? 'bg-[#281E17] border-[#FF8733] text-[#FFAD66] font-bold'
                        : 'bg-[#171820] border-white/10 text-[#A6A9B7] hover:text-[#F4F1EA] hover:border-white/25'
                    }`}
                  >
                    {shell.letter} {shell.electrons}
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] font-mono text-[#A6A9B7] tabular-nums">
              Shell {activeShell?.letter}: {activeShell?.electrons} e⁻ · {tungsten.electronConfig}
            </div>
          </div>
        </section>

        {/* CENTER ZONE: Hero Title, Play CTA, Secondary Navigation & Footer */}
        <section className="lg:col-span-4 order-1 lg:order-2 flex flex-col items-center text-center justify-center gap-7 py-2">
          <div className="space-y-4 max-w-md">
            <p className="font-mono text-xs font-semibold tracking-wider text-[#FF8733]">
              V2 · Research Edition
            </p>
            <h1
              className="font-display font-extrabold tracking-tight text-[#F4F1EA] leading-[1.04]"
              style={{
                fontSize: 'clamp(2.35rem, 3.6vw, 3.5rem)',
                textWrap: 'balance',
              }}
            >
              PERIODIC TABLE MONOPOLY
            </h1>
            <p className="text-sm sm:text-[15px] text-[#A6A9B7] leading-relaxed">
              3D Chemistry Monopoly board merged with an interactive 118-element Periodic Explorer,
              3D orbitals, compounds, and temperature phase simulation.
            </p>
          </div>

          <div className="w-full max-w-xs flex flex-col items-stretch gap-3">
            <button
              type="button"
              onClick={onPlay}
              className="w-full min-h-[52px] px-8 py-3.5 rounded-xl bg-[#7029FF] hover:bg-[#5F1EE3] active:scale-[0.99] text-white font-display font-bold text-base tracking-wide shadow-[0_12px_36px_rgba(112,41,255,0.38)] flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7029FF] whitespace-nowrap shrink-0"
            >
              <Play className="w-5 h-5 fill-current shrink-0" />
              <span>Play</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onNewGame}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#171820] border border-white/15 hover:border-[#286BFF] hover:bg-[#20222D] text-xs font-semibold text-[#F4F1EA] flex items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#286BFF] whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#286BFF] shrink-0" />
                <span>New Game</span>
              </button>

              <button
                type="button"
                onClick={onOpenResearchLab}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#171820] border border-white/15 hover:border-[#FF8733] hover:bg-[#20222D] text-xs font-semibold text-[#F4F1EA] flex items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF8733] whitespace-nowrap shrink-0"
              >
                <Grid3x3 className="w-3.5 h-3.5 text-[#FF8733] shrink-0" />
                <span>Research Lab</span>
              </button>
            </div>

            {savedSession && (
              <p className="text-xs font-mono text-[#A6A9B7] tabular-nums pt-0.5">
                Saved match · {savedSession.teamCount} teams · Turn: {savedSession.activeTeamName}
              </p>
            )}
          </div>

          <footer className="w-full max-w-xs pt-5 border-t border-white/10">
            <p className="font-mono text-xs text-[#A6A9B7]">© Akhdan Habibi Ramadhani</p>
          </footer>
        </section>

        {/* RIGHT ZONE: Floating Tilted Periodic Table (angled toward Title & Play) + Purple Erlenmeyer Flask */}
        <section
          aria-label="Floating periodic table and purple reagent Erlenmeyer flask"
          className="lg:col-span-4 order-3 flex flex-col items-center justify-center gap-4"
        >
          <div className="relative w-full max-w-[430px] pt-2 pb-6 flex flex-col items-center">
            {/* Floating Tilted Periodic Table angled toward center Play & Title */}
            <div className="w-full flex justify-center lg:justify-start pr-4 sm:pr-10">
              <div className="ptm-ptable-float w-[310px] sm:w-[345px] bg-[#171820]/90 border border-white/15 rounded-2xl p-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
                <div
                  className="grid gap-[2px]"
                  style={{
                    gridTemplateColumns: 'repeat(18, minmax(0, 1fr))',
                    gridTemplateRows: 'repeat(10, minmax(0, 1fr))',
                  }}
                >
                  {positionedElements.map(({ el, col, row }) => {
                    const meta = el.category ? CATEGORY_META_BY_ID[el.category] : undefined;
                    const isFocused = hoveredElement.atomicNumber === el.atomicNumber;
                    return (
                      <button
                        key={el.atomicNumber}
                        type="button"
                        onMouseEnter={() => setHoveredElement(el)}
                        onFocus={() => setHoveredElement(el)}
                        onClick={() => setHoveredElement(el)}
                        aria-label={`${el.nameEn} (${el.symbol})`}
                        style={{
                          gridColumn: col,
                          gridRow: row,
                          backgroundColor: isFocused
                            ? meta?.accentHex || '#286BFF'
                            : meta?.surfaceHex || '#20222D',
                          borderColor: isFocused
                            ? '#F4F1EA'
                            : meta?.borderHex || 'rgba(255,255,255,0.12)',
                        }}
                        className="aspect-square rounded-[2px] border flex items-center justify-center text-[6px] sm:text-[7px] font-mono font-bold leading-none text-[#F4F1EA] cursor-pointer transition-transform duration-150 hover:scale-125 hover:z-10 focus-visible:outline-1 focus-visible:outline-white"
                      >
                        {el.symbol}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Foreground Purple-Filled Erlenmeyer Flask */}
            <div className="relative -mt-12 sm:-mt-16 self-end mr-1 sm:mr-2 z-20 flex flex-col items-center">
              <button
                type="button"
                onClick={() => setFlaskSwirlActive((prev) => !prev)}
                aria-label="Purple reagent Erlenmeyer flask — click to swirl"
                className="ptm-flask-float group relative w-[148px] sm:w-[168px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7029FF] rounded-2xl"
              >
                <svg
                  viewBox="0 0 210 250"
                  className="w-full h-auto drop-shadow-[0_18px_34px_rgba(112,41,255,0.42)]"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="purpleReagentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#A855F7" stopOpacity="0.95" />
                      <stop offset="50%" stopColor="#7029FF" stopOpacity="0.96" />
                      <stop offset="100%" stopColor="#3B0FA8" stopOpacity="0.98" />
                    </linearGradient>
                    <linearGradient id="flaskGlassSheen" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
                      <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.04" />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.12" />
                    </linearGradient>
                    <clipPath id="flaskInteriorClip">
                      <path d="M 85 26 L 125 26 L 125 82 L 178 194 Q 186 212 167 220 L 43 220 Q 24 212 32 194 L 85 82 Z" />
                    </clipPath>
                  </defs>

                  {/* Soft purple reagent aura behind flask base */}
                  <ellipse cx="105" cy="182" rx="68" ry="34" fill="#7029FF" opacity="0.22" />

                  {/* Glass body background */}
                  <path
                    d="M 83 24 L 127 24 L 127 81 L 181 195 Q 190 216 168 224 L 42 224 Q 20 216 29 195 L 83 81 Z"
                    fill="rgba(23, 24, 32, 0.72)"
                    stroke="rgba(244, 241, 234, 0.38)"
                    strokeWidth="2.5"
                  />

                  {/* Purple liquid clipped to flask interior */}
                  <g clipPath="url(#flaskInteriorClip)">
                    <path
                      d={
                        flaskSwirlActive
                          ? 'M 20 132 Q 62 118 105 132 T 190 132 L 190 230 L 20 230 Z'
                          : 'M 20 136 Q 62 128 105 136 T 190 136 L 190 230 L 20 230 Z'
                      }
                      fill="url(#purpleReagentGrad)"
                    />
                    {/* Glowing purple meniscus highlight */}
                    <path
                      d={
                        flaskSwirlActive
                          ? 'M 24 132 Q 64 119 105 132 T 186 132'
                          : 'M 24 136 Q 64 128 105 136 T 186 136'
                      }
                      fill="none"
                      stroke="#E9D5FF"
                      strokeWidth="2.5"
                      strokeOpacity="0.72"
                    />

                    {/* Rising bubbles inside purple liquid */}
                    {BUBBLES.map((b, idx) => (
                      <circle
                        key={idx}
                        cx={b.cx}
                        cy={b.cy}
                        r={b.r}
                        fill="#F3E8FF"
                        className="ptm-bubble"
                        style={
                          {
                            '--bubble-duration': flaskSwirlActive ? '1.35s' : b.duration,
                            '--bubble-delay': b.delay,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                  </g>

                  {/* Left glass specular highlight */}
                  <path
                    d="M 90 36 L 90 83 L 45 189 Q 41 200 49 205"
                    fill="none"
                    stroke="url(#flaskGlassSheen)"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />

                  {/* Flask rim collar */}
                  <rect
                    x="76"
                    y="16"
                    width="58"
                    height="10"
                    rx="5"
                    fill="#20222D"
                    stroke="rgba(244, 241, 234, 0.5)"
                    strokeWidth="2"
                  />

                  {/* Volumetric graduation lines */}
                  <g stroke="rgba(244, 241, 234, 0.42)" strokeWidth="1.4" strokeLinecap="round">
                    <line x1="136" y1="146" x2="150" y2="146" />
                    <line x1="142" y1="168" x2="158" y2="168" />
                    <line x1="148" y1="190" x2="165" y2="190" />
                  </g>
                </svg>
              </button>
            </div>

            {/* Quiet unboxed readout for hovered periodic element + flask state */}
            <div className="mt-1 text-center font-mono text-[11px] text-[#A6A9B7] tabular-nums">
              <span className="text-[#F4F1EA] font-semibold">
                {hoveredElement.atomicNumber} · {hoveredElement.symbol} · {hoveredElement.nameEn}
              </span>
              <span aria-hidden="true"> · </span>
              <span>{hoveredCategory?.nameEn ?? hoveredElement.category}</span>
              <span aria-hidden="true"> · </span>
              <span className="text-[#C084FC]">
                {flaskSwirlActive ? 'Reagent Swirling' : 'Click flask to swirl'}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

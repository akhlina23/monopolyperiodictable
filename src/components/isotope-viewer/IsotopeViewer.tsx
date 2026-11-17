import React, { useEffect, useMemo, useState } from 'react';
import { ChemicalElement } from '../../types/game';
import { getIsotopesForElement, IsotopeRecord } from '../../data/isotopes';
import { Atom, AlertTriangle, Search, ShieldCheck } from 'lucide-react';

interface IsotopeViewerProps {
  element: ChemicalElement;
}

type StabilityFilter = 'all' | 'stable' | 'radioactive';

/**
 * Generates deterministic Vogel phyllotaxis coordinates for Z protons + N neutrons
 * inside a compact nuclear cluster diagram without random layout jitter.
 */
function buildNucleonPositions(protons: number, neutrons: number): {
  nucleons: { x: number; y: number; kind: 'p' | 'n' }[];
  radius: number;
} {
  const total = Math.max(1, protons + neutrons);
  const scale = total > 180 ? 3.2 : total > 80 ? 4.2 : total > 30 ? 5.6 : 7.5;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const items: { x: number; y: number; kind: 'p' | 'n' }[] = [];

  // Interleave protons & neutrons evenly across radial shells
  let pLeft = protons;
  let nLeft = neutrons;
  for (let i = 0; i < total; i++) {
    const r = scale * Math.sqrt(i + 0.35);
    const theta = i * goldenAngle;
    let kind: 'p' | 'n';
    if (pLeft > 0 && nLeft > 0) {
      kind = i % 2 === 0 ? 'p' : 'n';
    } else {
      kind = pLeft > 0 ? 'p' : 'n';
    }
    if (kind === 'p') pLeft--;
    else nLeft--;
    items.push({
      x: 70 + r * Math.cos(theta),
      y: 70 + r * Math.sin(theta),
      kind,
    });
  }

  const nucleonRadius = total > 180 ? 2.4 : total > 80 ? 3.0 : total > 30 ? 3.9 : 5.2;
  return { nucleons: items, radius: nucleonRadius };
}

export const IsotopeViewer: React.FC<IsotopeViewerProps> = ({ element }) => {
  const { coverage, records } = getIsotopesForElement(element.atomicNumber);
  const [query, setQuery] = useState('');
  const [stabilityFilter, setStabilityFilter] = useState<StabilityFilter>('all');
  const [selectedMassNumber, setSelectedMassNumber] = useState<number | null>(
    records[0]?.massNumber ?? null
  );

  useEffect(() => {
    setSelectedMassNumber(records[0]?.massNumber ?? null);
    setStabilityFilter('all');
    setQuery('');
  }, [element.atomicNumber, records]);

  const filteredRecords = useMemo(() => {
    const q = query.toLowerCase().trim();
    return records.filter((r) => {
      const matchesStability =
        stabilityFilter === 'all' ||
        (stabilityFilter === 'stable' && r.isStable) ||
        (stabilityFilter === 'radioactive' && !r.isStable);
      const matchesQuery =
        !q ||
        r.notation.toLowerCase().includes(q) ||
        String(r.massNumber).includes(q) ||
        (r.decayMode || '').toLowerCase().includes(q);
      return matchesStability && matchesQuery;
    });
  }, [records, query, stabilityFilter]);

  const selectedIsotope: IsotopeRecord | null = useMemo(() => {
    if (filteredRecords.length === 0 && records.length === 0) return null;
    const match =
      filteredRecords.find((r) => r.massNumber === selectedMassNumber) ||
      filteredRecords[0] ||
      records[0] ||
      null;
    return match;
  }, [filteredRecords, records, selectedMassNumber]);

  const neutronCount = selectedIsotope
    ? Math.max(0, selectedIsotope.massNumber - element.atomicNumber)
    : 0;
  const nzRatio =
    selectedIsotope && element.atomicNumber > 0
      ? (neutronCount / element.atomicNumber).toFixed(3)
      : '—';

  const cluster = useMemo(() => {
    if (!selectedIsotope) return { nucleons: [], radius: 4 };
    return buildNucleonPositions(element.atomicNumber, neutronCount);
  }, [selectedIsotope, element.atomicNumber, neutronCount]);

  return (
    <div className="bg-[#171820] border border-white/10 rounded-xl p-4 flex flex-col gap-3 h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div>
          <h3 className="font-display text-base font-bold text-[#F4F1EA] flex items-center gap-2">
            <Atom className="w-4 h-4 text-[#7029FF]" />
            Isotopes of {element.nameEn} ({element.symbol}, Z={element.atomicNumber})
          </h3>
          <p className="text-xs text-[#A6A9B7]">
            {element.nameId} · Standard Atomic Mass:{' '}
            <span className="font-mono">{element.atomicMassDisplay}</span> · Source: IAEA / NIST
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {coverage === 'verified' && (
            <>
              <div className="flex bg-[#09090D] p-0.5 rounded-lg border border-white/10 text-[11px] font-semibold">
                {(['all', 'stable', 'radioactive'] as StabilityFilter[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setStabilityFilter(mode)}
                    className={`px-2.5 py-1 rounded-md capitalize cursor-pointer transition-colors ${
                      stabilityFilter === mode
                        ? 'bg-[#7029FF] text-white'
                        : 'text-[#A6A9B7] hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A6A9B7]" />
                <input
                  type="text"
                  aria-label="Filter isotopes"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter mass / decay..."
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-[#09090D] border border-white/15 text-xs text-[#F4F1EA]"
                />
              </div>
            </>
          )}

          <span
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
              coverage === 'verified'
                ? 'bg-[#14291D] border-[#236942] text-[#86EFAC]'
                : 'bg-[#20222D] border-white/15 text-[#A6A9B7]'
            }`}
          >
            {coverage === 'verified' ? `${records.length} Verified Isotopes` : 'Data belum tersedia'}
          </span>
        </div>
      </div>

      {coverage === 'verified' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Selectable Nuclide Table */}
          <div className="lg:col-span-8 overflow-x-auto bg-[#09090D]/50 border border-white/10 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[#A6A9B7] uppercase text-[10px] tracking-wider bg-[#20222D]/60">
                  <th className="py-2 px-3">Isotope</th>
                  <th className="py-2 px-3">Mass (A)</th>
                  <th className="py-2 px-3">Neutrons (N)</th>
                  <th className="py-2 px-3">Exact Mass (u)</th>
                  <th className="py-2 px-3">Natural Abundance</th>
                  <th className="py-2 px-3">Stability / Half-Life</th>
                  <th className="py-2 px-3">Decay Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 tabular-nums">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 px-3 text-center text-[#A6A9B7]">
                      No verified isotopes match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((iso) => {
                    const isSelected = selectedIsotope?.massNumber === iso.massNumber;
                    return (
                      <tr
                        key={iso.massNumber}
                        onClick={() => setSelectedMassNumber(iso.massNumber)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#7029FF]/25 text-white'
                            : 'hover:bg-[#20222D]'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-[#F4F1EA]">{iso.notation}</td>
                        <td className="py-2.5 px-3 font-mono text-[#286BFF] font-bold">
                          {iso.massNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#A6A9B7]">
                          {iso.massNumber - element.atomicNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#F4F1EA]">{iso.atomicMassU}</td>
                        <td className="py-2.5 px-3 font-mono text-[#FF8733]">
                          {iso.naturalAbundancePct ?? 'Data belum tersedia'}
                        </td>
                        <td className="py-2.5 px-3">
                          {iso.isStable ? (
                            <span className="inline-flex items-center gap-1 text-[#86EFAC] font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5" /> Stable
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#FCA5A5] font-mono">
                              <AlertTriangle className="w-3.5 h-3.5" /> {iso.halfLife}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#A6A9B7]">
                          {iso.decayMode ?? '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Selected Isotope Nuclear Visualization Panel */}
          <div className="lg:col-span-4 bg-[#20222D] border border-white/10 rounded-xl p-3.5 flex flex-col justify-between gap-3">
            {selectedIsotope ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#A6A9B7]">
                      Selected Nuclide Nucleus
                    </span>
                    <div className="font-display text-lg font-bold text-white">
                      {selectedIsotope.notation}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      selectedIsotope.isStable
                        ? 'bg-[#14291D] border-[#236942] text-[#86EFAC]'
                        : 'bg-[#3B161B] border-[#F45B69]/40 text-[#FCA5A5]'
                    }`}
                  >
                    {selectedIsotope.isStable ? 'STABLE' : 'RADIOACTIVE'}
                  </span>
                </div>

                {/* Deterministic SVG Nucleon Cluster */}
                <div className="bg-[#09090D] border border-white/10 rounded-xl p-2 flex flex-col items-center">
                  <svg
                    viewBox="0 0 140 140"
                    className="w-36 h-36"
                    role="img"
                    aria-label={`Nuclear diagram of ${selectedIsotope.notation}: ${element.atomicNumber} protons and ${neutronCount} neutrons`}
                  >
                    <circle
                      cx="70"
                      cy="70"
                      r="64"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeDasharray="3 3"
                    />
                    {cluster.nucleons.map((nuc, idx) => (
                      <circle
                        key={idx}
                        cx={nuc.x}
                        cy={nuc.y}
                        r={cluster.radius}
                        fill={nuc.kind === 'p' ? '#FF8733' : '#286BFF'}
                        stroke="#09090D"
                        strokeWidth="0.6"
                      />
                    ))}
                  </svg>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-[#A6A9B7] pt-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF8733]" />
                      Protons ({element.atomicNumber}p⁺)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#286BFF]" />
                      Neutrons ({neutronCount}n⁰)
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] tabular-nums">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#A6A9B7]">Mass Number (A = Z + N)</span>
                    <strong className="font-mono text-[#F4F1EA]">{selectedIsotope.massNumber}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#A6A9B7]">N / Z Ratio</span>
                    <strong className="font-mono text-[#22D3EE]">{nzRatio}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#A6A9B7]">Exact Nuclide Mass</span>
                    <strong className="font-mono text-[#F4F1EA]">{selectedIsotope.atomicMassU} u</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#A6A9B7]">Natural Abundance</span>
                    <strong className="font-mono text-[#FF8733]">
                      {selectedIsotope.naturalAbundancePct ?? 'Data belum tersedia'}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#A6A9B7]">Half-Life / Decay</span>
                    <strong className="font-mono text-[#F4F1EA]">
                      {selectedIsotope.isStable
                        ? 'Stable'
                        : `${selectedIsotope.halfLife} (${selectedIsotope.decayMode ?? '—'})`}
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-[#A6A9B7]">
                Select an isotope row to inspect its nucleus.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#20222D]/60 rounded-xl border border-white/10">
          <p className="text-sm font-semibold text-[#F4F1EA]">
            Data isotop terverifikasi untuk {element.nameEn} ({element.symbol}): Data belum tersedia
          </p>
          <p className="text-xs text-[#A6A9B7] max-w-md mt-1.5 leading-relaxed">
            Untuk menjaga akurasi ilmiah, catatan nuklida yang belum terverifikasi ditandai{' '}
            <span className="font-mono text-[#FF8733]">Data belum tersedia</span> dan tidak dikarang.
            Coba pilih Hydrogen (1), Carbon (6), Oxygen (8), Chlorine (17), Iron (26), Bromine (35), Gold (79), atau Uranium (92).
          </p>
        </div>
      )}
    </div>
  );
};

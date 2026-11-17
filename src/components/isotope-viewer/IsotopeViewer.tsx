import React, { useEffect, useMemo, useState } from 'react';
import { ChemicalElement } from '../../types/game';
import { CATEGORY_COLORS, ELEMENTS_BY_ID, ELEMENTS_LIST } from '../../engine/gameEngine';
import {
  getIsobarsByMassNumber,
  getIsotonesByNeutronCount,
  getMostAbundantNuclide,
  getNuclideEntriesForElement,
  getNuclideKey,
  NuclideEntry,
  NuclideMode,
  VERIFIED_ISOTOPES_BY_ATOMIC_NUMBER,
} from '../../data/isotopes';
import {
  AlertTriangle,
  ArrowRightLeft,
  Atom,
  GripVertical,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';

interface IsotopeViewerProps {
  element: ChemicalElement;
  onSelectElement?: (element: ChemicalElement) => void;
}

type StabilityFilter = 'all' | 'stable' | 'radioactive';

const MODE_OPTIONS: { id: NuclideMode; label: string; rule: string }[] = [
  { id: 'isotop', label: 'Isotop', rule: 'Sama Proton (Z)' },
  { id: 'isobar', label: 'Isobar', rule: 'Sama Massa (A)' },
  { id: 'isoton', label: 'Isoton', rule: 'Sama Neutron (N)' },
];

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

export const IsotopeViewer: React.FC<IsotopeViewerProps> = ({ element, onSelectElement }) => {
  const [nuclideMode, setNuclideMode] = useState<NuclideMode>('isotop');
  const [isCleared, setIsCleared] = useState(false);
  const [isDragOverDropZone, setIsDragOverDropZone] = useState(false);
  const [query, setQuery] = useState('');
  const [stabilityFilter, setStabilityFilter] = useState<StabilityFilter>('all');

  const [anchorMassNumber, setAnchorMassNumber] = useState<number | null>(() => {
    return getMostAbundantNuclide(element.atomicNumber)?.massNumber ?? null;
  });
  const [anchorNeutronCount, setAnchorNeutronCount] = useState<number | null>(() => {
    return getMostAbundantNuclide(element.atomicNumber)?.neutronCount ?? null;
  });
  const [inspectedKey, setInspectedKey] = useState<string | null>(() => {
    const abundant = getMostAbundantNuclide(element.atomicNumber);
    return abundant ? getNuclideKey(abundant.atomicNumber, abundant.massNumber) : null;
  });

  // Organize periodic table elements cleanly into main grid + f-block strips
  const { mainElements, lanthanides, actinides } = useMemo(() => {
    const main: ChemicalElement[] = [];
    const la: ChemicalElement[] = [];
    const ac: ChemicalElement[] = [];
    ELEMENTS_LIST.forEach((el) => {
      if (el.atomicNumber >= 57 && el.atomicNumber <= 71) {
        la.push(el);
      } else if (el.atomicNumber >= 89 && el.atomicNumber <= 103) {
        ac.push(el);
      } else if (el.period && el.groupNumber) {
        main.push(el);
      }
    });
    la.sort((a, b) => a.atomicNumber - b.atomicNumber);
    ac.sort((a, b) => a.atomicNumber - b.atomicNumber);
    return { mainElements: main, lanthanides: la, actinides: ac };
  }, []);

  const anchorEntries = useMemo(
    () => getNuclideEntriesForElement(element.atomicNumber),
    [element.atomicNumber]
  );
  const mostAbundantAnchor = useMemo(
    () => getMostAbundantNuclide(element.atomicNumber),
    [element.atomicNumber]
  );

  // Sync defaults whenever global element changes externally
  useEffect(() => {
    setIsCleared(false);
    setQuery('');
    setStabilityFilter('all');
    const abundant = getMostAbundantNuclide(element.atomicNumber);
    setAnchorMassNumber(abundant?.massNumber ?? null);
    setAnchorNeutronCount(abundant?.neutronCount ?? null);
    setInspectedKey(abundant ? getNuclideKey(abundant.atomicNumber, abundant.massNumber) : null);
  }, [element.atomicNumber]);

  const activeAnchorNuclide: NuclideEntry | null = useMemo(() => {
    if (isCleared || anchorEntries.length === 0) return null;
    if (nuclideMode === 'isobar' && anchorMassNumber !== null) {
      return (
        anchorEntries.find((n) => n.massNumber === anchorMassNumber) ??
        mostAbundantAnchor ??
        anchorEntries[0]
      );
    }
    if (nuclideMode === 'isoton' && anchorNeutronCount !== null) {
      return (
        anchorEntries.find((n) => n.neutronCount === anchorNeutronCount) ??
        mostAbundantAnchor ??
        anchorEntries[0]
      );
    }
    return mostAbundantAnchor ?? anchorEntries[0];
  }, [isCleared, anchorEntries, nuclideMode, anchorMassNumber, anchorNeutronCount, mostAbundantAnchor]);

  const modeRecords: NuclideEntry[] = useMemo(() => {
    if (isCleared || anchorEntries.length === 0) return [];
    if (nuclideMode === 'isotop') {
      return anchorEntries;
    }
    if (nuclideMode === 'isobar') {
      const targetA = activeAnchorNuclide?.massNumber ?? anchorMassNumber;
      if (targetA === null || targetA === undefined) return [];
      return getIsobarsByMassNumber(targetA);
    }
    const targetN = activeAnchorNuclide?.neutronCount ?? anchorNeutronCount;
    if (targetN === null || targetN === undefined) return [];
    return getIsotonesByNeutronCount(targetN);
  }, [
    isCleared,
    anchorEntries,
    nuclideMode,
    activeAnchorNuclide,
    anchorMassNumber,
    anchorNeutronCount,
  ]);

  // Partner elements (different atomicNumber sharing the same A or N)
  const partnerElementSet = useMemo(() => {
    const set = new Set<number>();
    if (isCleared || nuclideMode === 'isotop') return set;
    modeRecords.forEach((rec) => {
      if (rec.atomicNumber !== element.atomicNumber) {
        set.add(rec.atomicNumber);
      }
    });
    return set;
  }, [isCleared, nuclideMode, modeRecords, element.atomicNumber]);

  const filteredRecords = useMemo(() => {
    const q = query.toLowerCase().trim();
    return modeRecords.filter((r) => {
      const matchesStability =
        stabilityFilter === 'all' ||
        (stabilityFilter === 'stable' && r.isStable) ||
        (stabilityFilter === 'radioactive' && !r.isStable);
      const matchesQuery =
        !q ||
        r.notation.toLowerCase().includes(q) ||
        r.symbol.toLowerCase().includes(q) ||
        r.elementNameEn.toLowerCase().includes(q) ||
        r.elementNameId.toLowerCase().includes(q) ||
        String(r.massNumber).includes(q) ||
        String(r.atomicNumber) === q ||
        String(r.neutronCount) === q ||
        (r.decayMode || '').toLowerCase().includes(q);
      return matchesStability && matchesQuery;
    });
  }, [modeRecords, query, stabilityFilter]);

  const selectedNuclide: NuclideEntry | null = useMemo(() => {
    if (isCleared || modeRecords.length === 0) return null;
    if (inspectedKey) {
      const direct = modeRecords.find(
        (r) => getNuclideKey(r.atomicNumber, r.massNumber) === inspectedKey
      );
      if (direct) return direct;
    }
    return (
      filteredRecords[0] ??
      activeAnchorNuclide ??
      modeRecords[0] ??
      null
    );
  }, [isCleared, modeRecords, inspectedKey, filteredRecords, activeAnchorNuclide]);

  const nzRatio =
    selectedNuclide && selectedNuclide.atomicNumber > 0
      ? (selectedNuclide.neutronCount / selectedNuclide.atomicNumber).toFixed(3)
      : '—';

  const cluster = useMemo(() => {
    if (!selectedNuclide) return { nucleons: [], radius: 4 };
    return buildNucleonPositions(selectedNuclide.atomicNumber, selectedNuclide.neutronCount);
  }, [selectedNuclide]);

  const selectAnchorElement = (nextEl: ChemicalElement) => {
    setIsCleared(false);
    setQuery('');
    setStabilityFilter('all');
    const abundant = getMostAbundantNuclide(nextEl.atomicNumber);
    setAnchorMassNumber(abundant?.massNumber ?? null);
    setAnchorNeutronCount(abundant?.neutronCount ?? null);
    setInspectedKey(abundant ? getNuclideKey(abundant.atomicNumber, abundant.massNumber) : null);
    if (nextEl.atomicNumber !== element.atomicNumber) {
      onSelectElement?.(nextEl);
    }
  };

  const handleTileClick = (tileEl: ChemicalElement) => {
    if (
      !isCleared &&
      nuclideMode !== 'isotop' &&
      partnerElementSet.has(tileEl.atomicNumber) &&
      tileEl.atomicNumber !== element.atomicNumber
    ) {
      // Inspect partner nuclide in place while preserving the active comparison table
      const matchingRow = modeRecords.find((r) => r.atomicNumber === tileEl.atomicNumber);
      if (matchingRow) {
        setInspectedKey(getNuclideKey(matchingRow.atomicNumber, matchingRow.massNumber));
        return;
      }
    }
    selectAnchorElement(tileEl);
  };

  const handleModeSwitch = (nextMode: NuclideMode) => {
    setNuclideMode(nextMode);
    setQuery('');
    setStabilityFilter('all');
    if (isCleared) return;
    const abundant = mostAbundantAnchor ?? anchorEntries[0] ?? null;
    if (!abundant) {
      setInspectedKey(null);
      return;
    }
    if (nextMode === 'isobar') {
      const targetA = anchorMassNumber ?? abundant.massNumber;
      const anchorMatch =
        anchorEntries.find((n) => n.massNumber === targetA) ?? abundant;
      setAnchorMassNumber(anchorMatch.massNumber);
      setInspectedKey(getNuclideKey(anchorMatch.atomicNumber, anchorMatch.massNumber));
    } else if (nextMode === 'isoton') {
      const targetN = anchorNeutronCount ?? abundant.neutronCount;
      const anchorMatch =
        anchorEntries.find((n) => n.neutronCount === targetN) ?? abundant;
      setAnchorNeutronCount(anchorMatch.neutronCount);
      setInspectedKey(getNuclideKey(anchorMatch.atomicNumber, anchorMatch.massNumber));
    } else {
      setInspectedKey(getNuclideKey(abundant.atomicNumber, abundant.massNumber));
    }
  };

  const handleClearDropZone = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCleared(true);
    setInspectedKey(null);
    setQuery('');
    setStabilityFilter('all');
  };

  const handleDropZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverDropZone) {
      setIsDragOverDropZone(true);
    }
  };

  const handleDropZoneDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOverDropZone(false);
    }
  };

  const handleDropZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverDropZone(false);
    const rawZ = e.dataTransfer.getData('text/plain');
    const parsedZ = Number.parseInt(rawZ, 10);
    if (!Number.isFinite(parsedZ)) return;
    const droppedEl = ELEMENTS_BY_ID[parsedZ];
    if (droppedEl) {
      selectAnchorElement(droppedEl);
    }
  };

  const renderPeriodicTile = (tileEl: ChemicalElement, gridStyle?: React.CSSProperties) => {
    const hasVerified = Boolean(VERIFIED_ISOTOPES_BY_ATOMIC_NUMBER[tileEl.atomicNumber]?.length);
    const isAnchor = !isCleared && tileEl.atomicNumber === element.atomicNumber;
    const isPartner = !isCleared && partnerElementSet.has(tileEl.atomicNumber);
    const isInspectedPartner =
      !isCleared &&
      selectedNuclide !== null &&
      selectedNuclide.atomicNumber === tileEl.atomicNumber &&
      tileEl.atomicNumber !== element.atomicNumber;

    const catColors = CATEGORY_COLORS[tileEl.category || 'Lainnya'] || CATEGORY_COLORS['Lainnya'];
    const isPartnerMode = !isCleared && nuclideMode !== 'isotop' && anchorEntries.length > 0;
    const isDimmed = isPartnerMode && !isAnchor && !isPartner;

    return (
      <button
        key={tileEl.atomicNumber}
        type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', String(tileEl.atomicNumber));
          e.dataTransfer.effectAllowed = 'copyMove';
        }}
        onClick={() => handleTileClick(tileEl)}
        style={{
          ...gridStyle,
          backgroundColor: isDimmed ? '#111218' : catColors.bg,
          borderColor: isAnchor
            ? '#7029FF'
            : isInspectedPartner
            ? '#FF8733'
            : isPartner
            ? '#22C55E'
            : isDimmed
            ? 'rgba(255,255,255,0.06)'
            : catColors.border,
        }}
        title={
          isPartner
            ? `${tileEl.nameEn} (${tileEl.symbol}, Z=${tileEl.atomicNumber}) — Klik untuk inspeksi partner ${nuclideMode}`
            : `${tileEl.nameEn} (${tileEl.symbol}, Z=${tileEl.atomicNumber}) — Seret ke Drop Zone atau klik`
        }
        className={`relative cursor-grab active:cursor-grabbing rounded border px-1 py-0.5 flex flex-col justify-between text-left transition-all select-none min-w-0 min-h-[34px] overflow-hidden ${
          isAnchor
            ? 'ring-2 ring-[#7029FF] z-20 scale-[1.06] shadow-md'
            : isInspectedPartner
            ? 'ring-2 ring-[#FF8733] z-20 scale-[1.06] shadow-md'
            : isPartner
            ? 'ring-2 ring-emerald-400/90 z-10 shadow-sm'
            : isDimmed
            ? 'opacity-35 hover:opacity-85'
            : 'hover:scale-[1.06] hover:z-20 hover:border-white/50'
        }`}
      >
        <div className="flex items-center justify-between w-full leading-none">
          <span className="font-mono text-[7.5px] font-bold text-[#A6A9B7] tabular-nums">
            {tileEl.atomicNumber}
          </span>
          {hasVerified && (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isPartner ? 'bg-emerald-400' : isAnchor ? 'bg-[#7029FF]' : 'bg-[#286BFF]/80'
              }`}
            />
          )}
        </div>
        <div className="font-display text-[11px] font-bold leading-tight text-[#F4F1EA] truncate">
          {tileEl.symbol}
        </div>
      </button>
    );
  };

  const anchorCategoryColor =
    CATEGORY_COLORS[element.category || 'Lainnya'] || CATEGORY_COLORS['Lainnya'];

  return (
    <div className="bg-[#171820] border border-white/10 rounded-xl p-4 flex flex-col gap-3.5 h-full">
      {/* 1. Header + Unified 3-Mode Selector (Isotop • Isobar • Isoton) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <h3 className="font-display text-base font-bold text-[#F4F1EA] flex items-center gap-2">
            <Atom className="w-4 h-4 text-[#7029FF]" />
            <span>
              {isCleared
                ? 'Isotop, Isobar & Isoton Explorer'
                : nuclideMode === 'isotop'
                ? `Isotop ${element.nameEn} (${element.symbol}, Z=${element.atomicNumber})`
                : nuclideMode === 'isobar'
                ? `Isobar Massa A=${activeAnchorNuclide?.massNumber ?? '—'} (Jangkar ${element.symbol})`
                : `Isoton Neutron N=${activeAnchorNuclide?.neutronCount ?? '—'} (Jangkar ${element.symbol})`}
            </span>
          </h3>
          <p className="text-xs text-[#A6A9B7] mt-0.5">
            {isCleared
              ? 'Seret unsur dari tabel periodik ke Drop Zone atau klik unsur mana saja · Sumber: IAEA / NIST'
              : `${element.nameId} · Massa Atom Standar ${element.atomicMassDisplay} u · Sumber: IAEA / NIST`}
          </p>
        </div>

        {/* 3-Mode Segmented Toggle */}
        <div
          role="tablist"
          aria-label="Nuclide comparison mode"
          className="flex flex-wrap items-center bg-[#09090D] p-1 rounded-xl border border-white/10 gap-1"
        >
          {MODE_OPTIONS.map((mode) => {
            const active = nuclideMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleModeSwitch(mode.id)}
                className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#7029FF] text-white shadow-sm'
                    : 'text-[#A6A9B7] hover:text-white hover:bg-[#20222D]'
                }`}
              >
                <span>{mode.label}</span>
                <span
                  className={`text-[10px] font-mono font-medium ${
                    active ? 'text-white/85' : 'text-[#A6A9B7]/70'
                  }`}
                >
                  ({mode.rule})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Compact Interactive Periodic Table with Dashed Drop Zone in Cols 3-12, Periods 1-3 */}
      <div className="bg-[#09090D]/80 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#A6A9B7]">
          <div className="flex items-center gap-2">
            <GripVertical className="w-3.5 h-3.5 text-[#7029FF]" />
            <span>
              Seret ubin unsur ke kotak putus-putus atau klik langsung untuk memilih.
            </span>
          </div>
          {!isCleared && nuclideMode !== 'isotop' && anchorEntries.length > 0 && (
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="flex items-center gap-1.5 text-[#F4F1EA]">
                <span className="w-2.5 h-2.5 rounded-xs border-2 border-[#7029FF]" />
                Jangkar ({element.symbol})
              </span>
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-xs border-2 border-emerald-400" />
                Partner {nuclideMode === 'isobar' ? 'Isobar' : 'Isoton'} ({partnerElementSet.size})
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="min-w-[680px] flex flex-col gap-1">
            {/* 18-Column Main Grid with Cols 3-12 Periods 1-3 Dashed Drop Zone */}
            <div className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-1">
              {/* Dashed Drop Zone occupying Columns 3–12 across Periods 1–3 */}
              <div
                data-testid="nuclide-drop-zone"
                onDragOver={handleDropZoneDragOver}
                onDragLeave={handleDropZoneDragLeave}
                onDrop={handleDropZoneDrop}
                style={{ gridColumn: '3 / span 10', gridRow: '1 / span 3' }}
                className={`rounded-xl border-2 border-dashed p-2.5 flex items-center justify-between gap-3 transition-colors ${
                  isDragOverDropZone
                    ? 'border-[#7029FF] bg-[#7029FF]/20'
                    : isCleared
                    ? 'border-white/25 bg-[#171820]/70 hover:border-white/40'
                    : 'border-[#7029FF]/60 bg-[#171820]/90'
                }`}
              >
                {isDragOverDropZone ? (
                  <div className="w-full flex flex-col items-center justify-center text-center py-2">
                    <span className="font-display text-sm font-bold text-white">
                      Lepas Unsur di Sini
                    </span>
                    <span className="text-[11px] text-[#D8B4FE]">
                      Muat Isotop, Isobar, dan Isoton terverifikasi
                    </span>
                  </div>
                ) : isCleared ? (
                  <div className="w-full flex flex-col items-center justify-center text-center px-3 py-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F1EA]">
                      <Atom className="w-4 h-4 text-[#7029FF]" />
                      <span>Seret atau klik unsur untuk memeriksa nuklida</span>
                    </div>
                    <p className="text-[10px] text-[#A6A9B7] mt-1">
                      Drop Zone kosong · Mendukung drag-and-drop &amp; klik langsung pada tabel periodik
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        style={{
                          backgroundColor: anchorCategoryColor.bg,
                          borderColor: anchorCategoryColor.border,
                        }}
                        className="w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center shrink-0 px-1"
                      >
                        <span className="font-mono text-[9px] text-[#A6A9B7] leading-none tabular-nums">
                          {element.atomicNumber}
                        </span>
                        <span className="font-display text-lg font-bold text-white leading-tight">
                          {element.symbol}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-display text-sm font-bold text-[#F4F1EA] truncate">
                            {element.nameEn}
                          </span>
                          <span className="text-xs text-[#A6A9B7]">({element.nameId})</span>
                        </div>
                        <div className="text-[11px] font-mono text-[#A6A9B7] tabular-nums mt-0.5">
                          Z = {element.atomicNumber} · Massa Standar {element.atomicMassDisplay} u
                        </div>
                        <div className="text-[11px] font-semibold mt-0.5">
                          {anchorEntries.length > 0 ? (
                            <span className="text-[#86EFAC]">
                              {anchorEntries.length} nuklida terverifikasi
                              {nuclideMode !== 'isotop' && partnerElementSet.size > 0
                                ? ` · ${partnerElementSet.size} unsur partner`
                                : ''}
                            </span>
                          ) : (
                            <span className="text-[#FF8733]">Data belum tersedia</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearDropZone}
                      aria-label="Clear selected element"
                      title="Kosongkan Drop Zone"
                      className="w-9 h-9 rounded-lg border border-white/15 bg-[#09090D]/80 hover:bg-[#3B161B] hover:border-[#F45B69]/50 text-[#A6A9B7] hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Main Periodic Tiles placed explicitly by period & group */}
              {mainElements.map((el) =>
                renderPeriodicTile(el, {
                  gridColumn: el.groupNumber ?? 1,
                  gridRow: el.period ?? 1,
                })
              )}

              {/* La-Lu & Ac-Lr Markers */}
              <div
                style={{ gridColumn: 3, gridRow: 6 }}
                className="flex flex-col items-center justify-center rounded border border-[#1E6178] bg-[#12262E] p-0.5 text-center min-h-[34px]"
              >
                <span className="font-mono text-[7px] font-bold text-[#67E8F9]">57–71</span>
                <span className="text-[6.5px] text-[#A6A9B7]">La–Lu</span>
              </div>
              <div
                style={{ gridColumn: 3, gridRow: 7 }}
                className="flex flex-col items-center justify-center rounded border border-[#822744] bg-[#2E161E] p-0.5 text-center min-h-[34px]"
              >
                <span className="font-mono text-[7px] font-bold text-[#FDA4AF]">89–103</span>
                <span className="text-[6.5px] text-[#A6A9B7]">Ac–Lr</span>
              </div>
            </div>

            {/* Compact Lanthanides & Actinides Rows */}
            <div className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-1 mt-0.5">
              <div className="col-span-2 flex items-center justify-end pr-1.5 text-[8px] font-bold text-[#67E8F9] uppercase tracking-wider">
                6 · La–Lu
              </div>
              {lanthanides.map((el) => renderPeriodicTile(el))}
              <div />

              <div className="col-span-2 flex items-center justify-end pr-1.5 text-[8px] font-bold text-[#FDA4AF] uppercase tracking-wider">
                7 · Ac–Lr
              </div>
              {actinides.map((el) => renderPeriodicTile(el))}
              <div />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Nuclide Anchor Selector (for Isobar A / Isoton N) + Filter Toolbar */}
      {!isCleared && anchorEntries.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#09090D]/55 border border-white/10 rounded-xl px-3 py-2">
          {/* Anchor A / N Picker when in Isobar or Isoton Mode */}
          {nuclideMode !== 'isotop' ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#A6A9B7] mr-1">
                {nuclideMode === 'isobar'
                  ? `Pilih Massa (A) ${element.symbol}:`
                  : `Pilih Neutron (N) ${element.symbol}:`}
              </span>
              {anchorEntries.map((entry) => {
                const isSelectedAnchor =
                  nuclideMode === 'isobar'
                    ? activeAnchorNuclide?.massNumber === entry.massNumber
                    : activeAnchorNuclide?.neutronCount === entry.neutronCount;
                const matchCount =
                  nuclideMode === 'isobar'
                    ? getIsobarsByMassNumber(entry.massNumber).length
                    : getIsotonesByNeutronCount(entry.neutronCount).length;
                return (
                  <button
                    key={entry.massNumber}
                    type="button"
                    onClick={() => {
                      if (nuclideMode === 'isobar') {
                        setAnchorMassNumber(entry.massNumber);
                      } else {
                        setAnchorNeutronCount(entry.neutronCount);
                      }
                      setInspectedKey(getNuclideKey(entry.atomicNumber, entry.massNumber));
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono tabular-nums cursor-pointer transition-colors whitespace-nowrap ${
                      isSelectedAnchor
                        ? 'bg-[#7029FF]/25 border-[#7029FF] text-white font-bold'
                        : 'bg-[#171820] border-white/10 text-[#A6A9B7] hover:text-white hover:border-white/25'
                    }`}
                  >
                    {entry.notation.split(' ')[0]} ·{' '}
                    {nuclideMode === 'isobar' ? `A=${entry.massNumber}` : `N=${entry.neutronCount}`}
                    {matchCount > 1 && (
                      <span className="ml-1 text-emerald-400">({matchCount} unsur)</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-[#A6A9B7] font-mono tabular-nums">
              Menampilkan semua isotop terverifikasi untuk{' '}
              <strong className="text-[#F4F1EA]">
                {element.symbol} (Z={element.atomicNumber})
              </strong>
            </div>
          )}

          {/* Stability Filter & Search */}
          <div className="flex flex-wrap items-center gap-2">
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
                aria-label="Filter nuclides"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter mass / symbol / decay..."
                className="pl-8 pr-3 py-1 rounded-lg bg-[#09090D] border border-white/15 text-xs text-[#F4F1EA] placeholder:text-[#A6A9B7]/60 focus:outline-none focus:border-[#7029FF]"
              />
            </div>

            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-[#14291D] border-[#236942] text-[#86EFAC] tabular-nums">
              {modeRecords.length} {nuclideMode === 'isotop' ? 'Isotop' : nuclideMode === 'isobar' ? 'Isobar' : 'Isoton'}
            </span>
          </div>
        </div>
      )}

      {/* 4. Split-Panel Nuclide Data Table (Left) & 2D Nucleus Particle Model (Right) */}
      {isCleared ? (
        <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center text-center p-8 bg-[#09090D]/50 rounded-xl border border-dashed border-white/15">
          <Atom className="w-9 h-9 text-[#7029FF] mb-2.5 opacity-85" />
          <p className="font-display text-sm font-bold text-[#F4F1EA]">
            Belum Ada Unsur yang Dipilih
          </p>
          <p className="text-xs text-[#A6A9B7] max-w-md mt-1.5 leading-relaxed">
            Seret salah satu ubin unsur dari Tabel Periodik ke dalam Drop Zone di tengah atas, atau klik langsung unsur pada tabel untuk membandingkan Isotop, Isobar, dan Isoton.
          </p>
        </div>
      ) : anchorEntries.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Left Panel: 8-Column Nuclide Data Table */}
          <div className="lg:col-span-8 overflow-x-auto bg-[#09090D]/50 border border-white/10 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[#A6A9B7] uppercase text-[10px] tracking-wider bg-[#20222D]/60">
                  <th className="py-2 px-3">Nuclide / Isotope</th>
                  <th className="py-2 px-2.5">Protons (Z)</th>
                  <th className="py-2 px-2.5">Mass (A)</th>
                  <th className="py-2 px-2.5">Neutrons (N)</th>
                  <th className="py-2 px-3">Exact Mass (u)</th>
                  <th className="py-2 px-3">Natural Abundance</th>
                  <th className="py-2 px-3">Stability / Half-Life</th>
                  <th className="py-2 px-3">Decay Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 tabular-nums">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 px-3 text-center text-[#A6A9B7]">
                      Tidak ada nuklida terverifikasi yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((nuc) => {
                    const rowKey = getNuclideKey(nuc.atomicNumber, nuc.massNumber);
                    const isSelected =
                      selectedNuclide &&
                      getNuclideKey(selectedNuclide.atomicNumber, selectedNuclide.massNumber) ===
                        rowKey;
                    const isPartnerRow =
                      nuclideMode !== 'isotop' && nuc.atomicNumber !== element.atomicNumber;
                    return (
                      <tr
                        key={rowKey}
                        onClick={() => setInspectedKey(rowKey)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#7029FF]/25 text-white'
                            : 'hover:bg-[#20222D]'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-[#F4F1EA]">
                          <div className="flex items-center gap-2">
                            <span>{nuc.notation}</span>
                            {nuclideMode !== 'isotop' && (
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                  isPartnerRow
                                    ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300'
                                    : 'bg-[#7029FF]/20 border-[#7029FF]/40 text-[#D8B4FE]'
                                }`}
                              >
                                {isPartnerRow ? nuc.elementNameEn : 'Jangkar'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 font-mono text-[#FF8733] font-bold">
                          {nuc.atomicNumber}
                        </td>
                        <td className="py-2.5 px-2.5 font-mono text-[#286BFF] font-bold">
                          {nuc.massNumber}
                        </td>
                        <td className="py-2.5 px-2.5 font-mono text-[#A6A9B7]">
                          {nuc.neutronCount}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#F4F1EA]">{nuc.atomicMassU}</td>
                        <td className="py-2.5 px-3 font-mono text-[#FF8733]">
                          {nuc.naturalAbundancePct ?? 'Data belum tersedia'}
                        </td>
                        <td className="py-2.5 px-3">
                          {nuc.isStable ? (
                            <span className="inline-flex items-center gap-1 text-[#86EFAC] font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5" /> Stable
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#FCA5A5] font-mono">
                              <AlertTriangle className="w-3.5 h-3.5" /> {nuc.halfLife}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#A6A9B7]">
                          {nuc.decayMode ?? '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Right Panel: 2D Nucleus Particle Model */}
          <div className="lg:col-span-4 bg-[#20222D] border border-white/10 rounded-xl p-3.5 flex flex-col justify-between gap-3">
            {selectedNuclide ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#A6A9B7]">
                      2D Nucleus Particle Model · {selectedNuclide.elementNameEn}
                    </span>
                    <div className="font-display text-lg font-bold text-white">
                      {selectedNuclide.notation}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                      selectedNuclide.isStable
                        ? 'bg-[#14291D] border-[#236942] text-[#86EFAC]'
                        : 'bg-[#3B161B] border-[#F45B69]/40 text-[#FCA5A5]'
                    }`}
                  >
                    {selectedNuclide.isStable ? 'STABLE' : 'RADIOACTIVE'}
                  </span>
                </div>

                {/* Switch Anchor CTA when inspecting a partner element */}
                {selectedNuclide.atomicNumber !== element.atomicNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      const partnerEl = ELEMENTS_BY_ID[selectedNuclide.atomicNumber];
                      if (partnerEl) selectAnchorElement(partnerEl);
                    }}
                    className="w-full py-1.5 px-2.5 rounded-lg border border-emerald-400/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Jadikan {selectedNuclide.symbol} (Z={selectedNuclide.atomicNumber}) Unsur Utama</span>
                  </button>
                )}

                {/* Deterministic SVG Nucleon Cluster */}
                <div className="bg-[#09090D] border border-white/10 rounded-xl p-2 flex flex-col items-center">
                  <svg
                    viewBox="0 0 140 140"
                    className="w-36 h-36"
                    role="img"
                    aria-label={`Nuclear diagram of ${selectedNuclide.notation}: ${selectedNuclide.atomicNumber} protons and ${selectedNuclide.neutronCount} neutrons`}
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
                      Protons ({selectedNuclide.atomicNumber}p⁺)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#286BFF]" />
                      Neutrons ({selectedNuclide.neutronCount}n⁰)
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] tabular-nums">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#A6A9B7]">Mass Number (A = Z + N)</span>
                    <strong className="font-mono text-[#F4F1EA]">
                      {selectedNuclide.massNumber} ({selectedNuclide.atomicNumber} +{' '}
                      {selectedNuclide.neutronCount})
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#A6A9B7]">N / Z Ratio</span>
                    <strong className="font-mono text-[#22D3EE]">{nzRatio}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#A6A9B7]">Exact Nuclide Mass</span>
                    <strong className="font-mono text-[#F4F1EA]">
                      {selectedNuclide.atomicMassU} u
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#A6A9B7]">Natural Abundance</span>
                    <strong className="font-mono text-[#FF8733]">
                      {selectedNuclide.naturalAbundancePct ?? 'Data belum tersedia'}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-[#A6A9B7]">Half-Life / Decay</span>
                    <strong className="font-mono text-[#F4F1EA]">
                      {selectedNuclide.isStable
                        ? 'Stable'
                        : `${selectedNuclide.halfLife} (${selectedNuclide.decayMode ?? '—'})`}
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-[#A6A9B7]">
                Pilih baris nuklida untuk memeriksa model inti atom.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#20222D]/60 rounded-xl border border-white/10">
          <p className="text-sm font-semibold text-[#F4F1EA]">
            Data nuklida terverifikasi untuk {element.nameEn} ({element.symbol}): Data belum tersedia
          </p>
          <p className="text-xs text-[#A6A9B7] max-w-md mt-1.5 leading-relaxed">
            Untuk menjaga akurasi ilmiah, catatan nuklida yang belum terverifikasi ditandai{' '}
            <span className="font-mono text-[#FF8733]">Data belum tersedia</span> dan tidak dikarang.
            Coba seret atau klik unsur bertanda titik biru seperti Hydrogen (1), Boron (5), Carbon (6), Oxygen (8), Sulfur (16), Argon (18), Calcium (20), Iron (26), Nickel (28), Gold (79), atau Uranium (92).
          </p>
        </div>
      )}
    </div>
  );
};

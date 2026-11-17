import React, { useMemo, useState } from 'react';
import {
  BoardColorMode,
  ChemicalElement,
  TemperatureUnit,
} from '../types/game';
import {
  CATEGORY_COLORS,
  ELEMENTS_BY_ID,
  ELEMENTS_LIST,
  getStateAtTemperature,
} from '../engine/gameEngine';
import {
  CHEMICAL_CATEGORIES,
  GROUP_TRADITIONAL_LABELS,
  MATTER_STATE_META,
} from '../data/categories';
import { convertCelsiusToUnit, convertUnitToCelsius } from '../data/elements';
import { ElementInspectorPanel } from './element-panel/ElementInspectorPanel';
import { OrbitalVisualizer3D } from './electron-visualization/OrbitalVisualizer3D';
import { IsotopeViewer } from './isotope-viewer/IsotopeViewer';
import { CompoundExplorer } from './compound-explorer/CompoundExplorer';
import {
  Atom,
  BarChart3,
  FlaskConical,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Thermometer,
  X,
} from 'lucide-react';

export type ExplorerTab = 'properties' | 'electrons' | 'isotopes' | 'compounds';
export type HeatmapMetric = 'none' | 'electronegativity' | 'meltingPointC' | 'ionizationEnergyEv' | 'atomicRadiusPm';

interface PeriodicTableExplorerProps {
  selectedElement: ChemicalElement;
  onSelectElement: (element: ChemicalElement) => void;
  onFocusOnBoard?: (atomicNumber: number) => void;
  temperatureC: number;
  onTemperatureChange: (tempC: number) => void;
  colorMode: BoardColorMode;
  onColorModeChange: (mode: BoardColorMode) => void;
  selectedBoardElementId?: number | null;
}

export const PeriodicTableExplorer: React.FC<PeriodicTableExplorerProps> = ({
  selectedElement,
  onSelectElement,
  onFocusOnBoard,
  temperatureC,
  onTemperatureChange,
  colorMode,
  onColorModeChange,
  selectedBoardElementId,
}) => {
  const [hoveredElement, setHoveredElement] = useState<ChemicalElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ExplorerTab>('properties');
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>('C');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [blockFilter, setBlockFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('none');

  const { gridMap, lanthanides, actinides } = useMemo(() => {
    const map: Record<string, ChemicalElement> = {};
    const la: ChemicalElement[] = [];
    const ac: ChemicalElement[] = [];

    ELEMENTS_LIST.forEach((el) => {
      if (el.atomicNumber >= 57 && el.atomicNumber <= 71) {
        la.push(el);
      } else if (el.atomicNumber >= 89 && el.atomicNumber <= 103) {
        ac.push(el);
      } else if (el.period && el.groupNumber) {
        map[`${el.period}-${el.groupNumber}`] = el;
      }
    });

    la.sort((a, b) => a.atomicNumber - b.atomicNumber);
    ac.sort((a, b) => a.atomicNumber - b.atomicNumber);
    return { gridMap: map, lanthanides: la, actinides: ac };
  }, []);

  const filteredSet = useMemo(() => {
    if (!searchQuery && !selectedCategoryFilter && blockFilter === 'all' && periodFilter === 'all') {
      return null;
    }
    const q = searchQuery.toLowerCase().trim();
    const match = new Set<number>();
    ELEMENTS_LIST.forEach((el) => {
      const matchSearch =
        !q ||
        el.nameEn.toLowerCase().includes(q) ||
        el.nameId.toLowerCase().includes(q) ||
        el.symbol.toLowerCase().includes(q) ||
        el.atomicNumber.toString() === q;
      const matchCat = !selectedCategoryFilter || el.category === selectedCategoryFilter;
      const matchBlock = blockFilter === 'all' || el.block === blockFilter;
      const matchPeriod = periodFilter === 'all' || String(el.period) === periodFilter;
      if (matchSearch && matchCat && matchBlock && matchPeriod) match.add(el.atomicNumber);
    });
    return match;
  }, [searchQuery, selectedCategoryFilter, blockFilter, periodFilter]);

  const heatmapRange = useMemo(() => {
    if (heatmapMetric === 'none') return null;
    const vals = ELEMENTS_LIST.map((e) => e[heatmapMetric]).filter(
      (v): v is number => typeof v === 'number' && !Number.isNaN(v)
    );
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  }, [heatmapMetric]);

  const getHeatmapStyle = (el: ChemicalElement): { bg: string; border: string } | null => {
    if (heatmapMetric === 'none' || !heatmapRange) return null;
    const val = el[heatmapMetric];
    if (typeof val !== 'number' || Number.isNaN(val)) {
      return { bg: '#1B1C24', border: '#343946' };
    }
    const norm = Math.max(0, Math.min(1, (val - heatmapRange.min) / Math.max(0.001, heatmapRange.max - heatmapRange.min)));
    const hue = Math.round(230 - norm * 200); // Cobalt Blue -> Warm Sunrise Orange/Red
    return {
      bg: `hsl(${hue}, 62%, ${20 + Math.round(norm * 20)}%)`,
      border: `hsl(${hue}, 82%, 56%)`,
    };
  };

  const displayEl = hoveredElement || selectedElement;
  const displayTempValue = convertCelsiusToUnit(temperatureC, tempUnit);

  const handleNumericTempInput = (raw: string) => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    const nextC = Math.max(-273.15, Math.min(6000, convertUnitToCelsius(parsed, tempUnit)));
    onTemperatureChange(Math.round(nextC));
  };

  const handleGridKeyDown = (e: React.KeyboardEvent, z: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = ELEMENTS_BY_ID[Math.min(118, z + 1)];
      if (next) onSelectElement(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = ELEMENTS_BY_ID[Math.max(1, z - 1)];
      if (prev) onSelectElement(prev);
    }
  };

  const renderElementCell = (element: ChemicalElement) => {
    const isSelected = selectedElement.atomicNumber === element.atomicNumber;
    const isBoardTarget = selectedBoardElementId === element.atomicNumber;
    const isDimmed = filteredSet !== null && !filteredSet.has(element.atomicNumber);
    const catColors = CATEGORY_COLORS[element.category || 'Lainnya'] || CATEGORY_COLORS['Lainnya'];
    const curState = getStateAtTemperature(element, temperatureC);
    const stateMeta = MATTER_STATE_META[curState];
    const heatStyle = getHeatmapStyle(element);

    const bgColor = isDimmed
      ? '#121218'
      : heatStyle
      ? heatStyle.bg
      : colorMode === 'state'
      ? stateMeta.bgHex
      : catColors.bg;
    const borderColor = isSelected
      ? '#FF8733'
      : isDimmed
      ? 'rgba(255,255,255,0.05)'
      : heatStyle
      ? heatStyle.border
      : colorMode === 'state'
      ? stateMeta.borderHex
      : catColors.border;
    const symbolColor = isDimmed
      ? '#4B5563'
      : colorMode === 'state' && !heatStyle
      ? stateMeta.textHex
      : '#F4F1EA';

    return (
      <button
        key={element.atomicNumber}
        type="button"
        onClick={() => onSelectElement(element)}
        onKeyDown={(e) => handleGridKeyDown(e, element.atomicNumber)}
        onMouseEnter={() => setHoveredElement(element)}
        onMouseLeave={() => setHoveredElement(null)}
        style={{
          backgroundColor: bgColor,
          borderColor,
        }}
        className={`relative cursor-pointer transition-transform duration-100 flex flex-col justify-between p-1 border rounded-md select-none text-left min-w-0 overflow-hidden ${
          isSelected
            ? 'ring-2 ring-[#FF8733] z-20 scale-[1.07] shadow-lg'
            : isBoardTarget
            ? 'ring-2 ring-[#286BFF] z-10'
            : isDimmed
            ? 'opacity-30'
            : 'hover:scale-[1.08] hover:z-20 hover:border-white/50'
        }`}
      >
        <div className="flex items-center justify-between w-full leading-none">
          <span className="font-mono text-[8px] font-bold text-[#A6A9B7] tabular-nums">
            {element.atomicNumber}
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: stateMeta.hex }}
            title={`State at ${temperatureC}°C: ${stateMeta.label}`}
          />
        </div>

        <div
          className="font-display text-[13px] font-bold leading-tight tracking-tight truncate"
          style={{ color: symbolColor }}
        >
          {element.symbol}
        </div>

        <div className="text-[7px] font-medium text-[#D1D5DB]/90 leading-none truncate w-full">
          {element.nameEn}
        </div>
        <div className="font-mono text-[6.5px] text-[#A6A9B7] leading-none truncate w-full tabular-nums mt-0.5">
          {element.atomicMassDisplay}
        </div>
      </button>
    );
  };

  return (
    <div className="w-full h-full flex flex-col gap-3 bg-[#09090D] text-[#F4F1EA]">
      {/* Top Ptable Header Bar: Tabs + Search + Temperature Simulation */}
      <div className="bg-[#171820] border border-white/10 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* 4 Navigation Tabs */}
        <div className="flex items-center bg-[#09090D] p-1 rounded-lg border border-white/10 gap-1">
          {[
            { id: 'properties', label: 'Properties', icon: Layers },
            { id: 'electrons', label: 'Electrons', icon: Sparkles },
            { id: 'isotopes', label: 'Isotop / Isobar / Isoton', icon: Atom },
            { id: 'compounds', label: 'Compounds', icon: FlaskConical },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ExplorerTab)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#286BFF] text-white'
                    : 'text-[#A6A9B7] hover:text-white hover:bg-[#20222D]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search + Block/Period Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative min-w-[165px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A6A9B7]" />
            <input
              type="text"
              aria-label="Search elements"
              placeholder="Search symbol, EN/ID, Z..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-[#09090D] border border-white/10 text-[#F4F1EA] placeholder:text-[#A6A9B7]/60 focus:outline-none focus:border-[#286BFF]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A6A9B7] hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            aria-label="Filter by block"
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-[#09090D] border border-white/10 text-[11px] font-mono text-[#F4F1EA]"
          >
            <option value="all">All Blocks</option>
            <option value="s">s-block</option>
            <option value="p">p-block</option>
            <option value="d">d-block</option>
            <option value="f">f-block</option>
          </select>

          <select
            aria-label="Filter by period"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-[#09090D] border border-white/10 text-[11px] font-mono text-[#F4F1EA]"
          >
            <option value="all">All Periods</option>
            {[1, 2, 3, 4, 5, 6, 7].map((p) => (
              <option key={p} value={String(p)}>
                Period {p}
              </option>
            ))}
          </select>
        </div>

        {/* Temperature Simulation Slider (Defaults to 0°C) */}
        <div className="flex flex-wrap items-center gap-2 bg-[#09090D] px-3 py-1.5 rounded-lg border border-white/10">
          <Thermometer className="w-4 h-4 text-[#FF8733] shrink-0" />
          <span className="text-[11px] font-semibold text-[#A6A9B7]">Temp:</span>

          <button
            type="button"
            aria-label="Decrease temperature"
            onClick={() => onTemperatureChange(Math.max(-273, temperatureC - 25))}
            className="p-1 rounded bg-[#20222D] hover:bg-[#343946] text-[#F4F1EA] cursor-pointer"
          >
            <Minus className="w-3 h-3" />
          </button>

          <input
            type="range"
            aria-label="Temperature simulation slider"
            min={-273}
            max={5000}
            step={5}
            value={temperatureC}
            onChange={(e) => onTemperatureChange(Number(e.target.value))}
            className="w-24 sm:w-32 h-1.5 rounded-lg cursor-pointer accent-[#FF8733]"
          />

          <button
            type="button"
            aria-label="Increase temperature"
            onClick={() => onTemperatureChange(Math.min(5000, temperatureC + 25))}
            className="p-1 rounded bg-[#20222D] hover:bg-[#343946] text-[#F4F1EA] cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>

          <input
            type="number"
            aria-label="Temperature numeric value"
            value={displayTempValue}
            onChange={(e) => handleNumericTempInput(e.target.value)}
            className="w-16 px-1.5 py-0.5 rounded bg-[#171820] border border-white/15 font-mono text-xs font-bold text-[#F4F1EA] text-right tabular-nums"
          />

          <div className="flex rounded bg-[#171820] border border-white/10 p-0.5 text-[10px] font-mono font-bold">
            {(['C', 'F', 'K'] as TemperatureUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setTempUnit(u)}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                  tempUnit === u ? 'bg-[#7029FF] text-white' : 'text-[#A6A9B7] hover:text-white'
                }`}
              >
                {u === 'K' ? 'K' : `°${u}`}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onTemperatureChange(0)}
            className="px-2 py-1 rounded bg-[#20222D] hover:bg-[#286BFF] border border-white/10 text-[10px] font-bold text-[#F4F1EA] flex items-center gap-1 cursor-pointer transition-colors"
            title="Reset temperature to 0°C"
          >
            <RotateCcw className="w-3 h-3" /> Reset Temperature
          </button>
        </div>

        {/* Color Mode & Heatmap Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-[#09090D] p-0.5 rounded-lg border border-white/10 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => {
                setHeatmapMetric('none');
                onColorModeChange('category');
              }}
              className={`px-2.5 py-1 rounded-md cursor-pointer ${
                heatmapMetric === 'none' && colorMode === 'category'
                  ? 'bg-[#7029FF] text-white'
                  : 'text-[#A6A9B7] hover:text-white'
              }`}
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => {
                setHeatmapMetric('none');
                onColorModeChange('state');
              }}
              className={`px-2.5 py-1 rounded-md cursor-pointer ${
                heatmapMetric === 'none' && colorMode === 'state'
                  ? 'bg-[#FF8733] text-[#09090D] font-bold'
                  : 'text-[#A6A9B7] hover:text-white'
              }`}
            >
              Matter States
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#09090D] px-2 py-1 rounded-lg border border-white/10">
            <BarChart3 className="w-3.5 h-3.5 text-[#32C48D]" />
            <select
              aria-label="Property trend heatmap"
              value={heatmapMetric}
              onChange={(e) => setHeatmapMetric(e.target.value as HeatmapMetric)}
              className="bg-transparent text-[11px] font-semibold text-[#F4F1EA] focus:outline-none cursor-pointer"
            >
              <option value="none" className="bg-[#171820]">Heatmap: Off</option>
              <option value="electronegativity" className="bg-[#171820]">Trend: Electronegativity</option>
              <option value="meltingPointC" className="bg-[#171820]">Trend: Melting Point</option>
              <option value="ionizationEnergyEv" className="bg-[#171820]">Trend: Ionization Energy</option>
              <option value="atomicRadiusPm" className="bg-[#171820]">Trend: Atomic Radius</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Tab Body */}
      {activeTab === 'properties' && (
        <div className="flex-1 flex flex-col xl:flex-row gap-3 min-h-0">
          {/* Left Dedicated Element Inspector */}
          <div className="w-full xl:w-64 shrink-0">
            <ElementInspectorPanel
              element={displayEl}
              temperatureC={temperatureC}
              tempUnit={tempUnit}
              onFocusOnBoard={onFocusOnBoard}
            />
          </div>

          {/* Right Periodic Grid + Legends */}
          <div className="flex-1 bg-[#171820] border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-2.5 overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10 text-[11px]">
              <div className="flex items-center gap-3">
                {(['Solid', 'Liquid', 'Gas', 'Unknown'] as const).map((st) => {
                  const m = MATTER_STATE_META[st];
                  return (
                    <span key={st} className="flex items-center gap-1.5 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: m.hex }} />
                      <span style={{ color: m.textHex }}>{m.label}</span>
                    </span>
                  );
                })}
              </div>
              <span className="font-mono text-[11px] text-[#A6A9B7] tabular-nums">
                Active Temp: <strong className="text-[#FF8733]">{temperatureC}°C</strong> ({(temperatureC + 273.15).toFixed(2)} K)
              </span>
            </div>

            {/* 18-Column Grid with Modern 1-18 & Traditional IA-VIIIA/B Headers */}
            <div className="min-w-[820px] flex flex-col gap-1">
              <div className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-1 text-center pb-1">
                {Array.from({ length: 18 }).map((_, idx) => {
                  const g = idx + 1;
                  return (
                    <div key={g} className="leading-tight">
                      <div className="font-mono text-[10px] font-bold text-[#F4F1EA]">{g}</div>
                      <div className="font-mono text-[8px] text-[#A6A9B7]">
                        {GROUP_TRADITIONAL_LABELS[g]}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-1">
                {Array.from({ length: 7 }).map((_, pIdx) => {
                  const period = pIdx + 1;
                  return Array.from({ length: 18 }).map((__, gIdx) => {
                    const group = gIdx + 1;
                    if (period === 6 && group === 3) {
                      return (
                        <div
                          key="la-slot"
                          className="flex flex-col items-center justify-center rounded-md border border-[#1E6178] bg-[#12262E] p-1 text-center"
                        >
                          <span className="font-mono text-[8px] font-bold text-[#67E8F9]">57–71</span>
                          <span className="text-[7px] font-semibold text-[#A6A9B7]">La–Lu</span>
                        </div>
                      );
                    }
                    if (period === 7 && group === 3) {
                      return (
                        <div
                          key="ac-slot"
                          className="flex flex-col items-center justify-center rounded-md border border-[#822744] bg-[#2E161E] p-1 text-center"
                        >
                          <span className="font-mono text-[8px] font-bold text-[#FDA4AF]">89–103</span>
                          <span className="text-[7px] font-semibold text-[#A6A9B7]">Ac–Lr</span>
                        </div>
                      );
                    }
                    const el = gridMap[`${period}-${group}`];
                    if (!el) return <div key={`empty-${period}-${group}`} />;
                    return renderElementCell(el);
                  });
                })}
              </div>

              {/* Lanthanides & Actinides positioned tightly beneath main grid */}
              <div className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-1 mt-1.5">
                <div className="col-span-2 flex items-center justify-end pr-2 text-[9px] font-bold text-[#67E8F9] uppercase tracking-wider">
                  6 · Lanthanides
                </div>
                {lanthanides.map((el) => renderElementCell(el))}
                <div />

                <div className="col-span-2 flex items-center justify-end pr-2 text-[9px] font-bold text-[#FDA4AF] uppercase tracking-wider">
                  7 · Actinides
                </div>
                {actinides.map((el) => renderElementCell(el))}
                <div />
              </div>
            </div>

            {/* Interactive 10-Category Filter Legend */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-white/10">
              {CHEMICAL_CATEGORIES.map((cat) => {
                const isSelected = selectedCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(isSelected ? null : cat.id)}
                    style={{
                      backgroundColor: isSelected ? cat.accentHex : cat.surfaceHex,
                      borderColor: cat.borderHex,
                      color: isSelected ? '#09090D' : cat.textHex,
                    }}
                    className="px-2 py-1 rounded-md border text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isSelected ? '#09090D' : cat.accentHex }}
                    />
                    <span>{cat.nameEn} ({cat.nameId})</span>
                  </button>
                );
              })}
              {selectedCategoryFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter(null)}
                  className="px-2 py-1 text-[10px] font-semibold text-[#A6A9B7] hover:text-white underline cursor-pointer"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'electrons' && (
        <div className="flex-1 min-h-[420px]">
          <OrbitalVisualizer3D element={selectedElement} />
        </div>
      )}

      {activeTab === 'isotopes' && (
        <div className="flex-1 min-h-[380px]">
          <IsotopeViewer element={selectedElement} onSelectElement={onSelectElement} />
        </div>
      )}

      {activeTab === 'compounds' && (
        <div className="flex-1 min-h-[380px]">
          <CompoundExplorer
            selectedElement={selectedElement}
            onSelectElement={(el) => {
              onSelectElement(el);
              setActiveTab('properties');
            }}
          />
        </div>
      )}
    </div>
  );
};

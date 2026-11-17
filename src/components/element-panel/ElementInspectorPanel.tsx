import React from 'react';
import { ChemicalElement, TemperatureUnit } from '../../types/game';
import { CATEGORY_COLORS, getStateAtTemperature } from '../../engine/gameEngine';
import { CATEGORY_META_BY_ID, MATTER_STATE_META } from '../../data/categories';
import { convertCelsiusToUnit } from '../../data/elements';
import { Compass } from 'lucide-react';

interface ElementInspectorPanelProps {
  element: ChemicalElement;
  temperatureC: number;
  tempUnit: TemperatureUnit;
  onFocusOnBoard?: (atomicNumber: number) => void;
}

export const ElementInspectorPanel: React.FC<ElementInspectorPanelProps> = ({
  element,
  temperatureC,
  tempUnit,
  onFocusOnBoard,
}) => {
  const catStyle = CATEGORY_COLORS[element.category || 'Lainnya'] || CATEGORY_COLORS['Lainnya'];
  const catMeta = element.category ? CATEGORY_META_BY_ID[element.category] : undefined;
  const matterState = getStateAtTemperature(element, temperatureC);
  const stateMeta = MATTER_STATE_META[matterState];

  const formatTemp = (valC: number | null | undefined) => {
    if (valC === null || valC === undefined) return 'Data belum tersedia';
    return `${convertCelsiusToUnit(valC, tempUnit)} ${tempUnit === 'K' ? 'K' : `°${tempUnit}`}`;
  };

  return (
    <div className="bg-[#171820] border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-2.5 h-full">
      {/* Element Hero Card */}
      <div
        style={{ backgroundColor: catStyle.bg, borderColor: catStyle.border }}
        className="rounded-xl p-3 border text-center relative overflow-hidden"
      >
        <div className="flex items-center justify-between text-[10px] font-mono font-bold">
          <span className="text-[#F4F1EA]">Z = {element.atomicNumber}</span>
          <span
            style={{
              backgroundColor: stateMeta.bgHex,
              borderColor: stateMeta.borderHex,
              color: stateMeta.textHex,
            }}
            className="px-2 py-0.5 rounded border text-[10px] font-bold"
          >
            {stateMeta.label}
          </span>
        </div>

        <div className="font-display text-4xl font-bold text-white tracking-tight mt-1">
          {element.symbol}
        </div>
        <div className="text-sm font-bold text-[#F4F1EA] mt-0.5">{element.nameEn}</div>
        <div className="text-[11px] text-[#A6A9B7]">{element.nameId}</div>
        <div className="font-mono text-xs text-[#F4F1EA]/85 mt-1 tabular-nums">
          {element.atomicMassDisplay}
        </div>
      </div>

      {/* Scientific & Monopoly Metrics — Uses exact `Data belum tersedia` for unmeasured values */}
      <div className="space-y-1.5 text-[11px] flex-1 overflow-y-auto pr-0.5 tabular-nums">
        <div className="flex justify-between py-1 border-b border-white/5">
          <span className="text-[#A6A9B7]">Series</span>
          <span className="font-semibold text-right" style={{ color: catStyle.text }}>
            {catMeta?.nameEn || element.category || 'Data belum tersedia'}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-white/5">
          <span className="text-[#A6A9B7]">Group / Period</span>
          <span className="font-mono font-semibold text-[#F4F1EA]">
            {element.groupNumber ? `${element.groupNumber} (${element.traditionalGroup})` : element.traditionalGroup || 'f-block'} · P{element.period}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-white/5">
          <span className="text-[#A6A9B7]">Block / Shells</span>
          <span className="font-mono text-[#F4F1EA]">
            {element.block?.toUpperCase()}-block · [{element.electronShells?.join(', ') || 'Data belum tersedia'}]
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-white/5">
          <span className="text-[#A6A9B7]">Melting Point</span>
          <span className="font-mono text-[#F4F1EA]">{formatTemp(element.meltingPointC)}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-white/5">
          <span className="text-[#A6A9B7]">Boiling Point</span>
          <span className="font-mono text-[#F4F1EA]">{formatTemp(element.boilingPointC)}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-white/5">
          <span className="text-[#A6A9B7]">Electronegativity</span>
          <span className="font-mono text-[#F4F1EA]">
            {element.electronegativity !== null && element.electronegativity !== undefined
              ? element.electronegativity
              : 'Data belum tersedia'}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-white/5">
          <span className="text-[#A6A9B7]">Density (STP)</span>
          <span className="font-mono text-[#F4F1EA]">
            {element.densityGcm3 !== null && element.densityGcm3 !== undefined
              ? `${element.densityGcm3} g/cm³`
              : 'Data belum tersedia'}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-white/5">
          <span className="text-[#A6A9B7]">Ionization (1st)</span>
          <span className="font-mono text-[#F4F1EA]">
            {element.ionizationEnergyEv !== null && element.ionizationEnergyEv !== undefined
              ? `${element.ionizationEnergyEv} eV`
              : 'Data belum tersedia'}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-white/5">
          <span className="text-[#A6A9B7]">Discovery</span>
          <span className="font-mono text-[#F4F1EA]">
            {element.discoveryYear || 'Data belum tersedia'}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-white/5">
          <span className="text-[#A6A9B7]">Board Price</span>
          <span className="font-mono font-bold text-[#FF8733]">
            {element.basePriceKK.toLocaleString('id-ID')} KK
          </span>
        </div>
      </div>

      {onFocusOnBoard && (
        <button
          type="button"
          onClick={() => onFocusOnBoard(element.atomicNumber)}
          className="w-full py-2 rounded-lg bg-[#286BFF] hover:bg-[#1D57DC] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <Compass className="w-3.5 h-3.5" /> Highlight on Monopoly Board
        </button>
      )}
    </div>
  );
};

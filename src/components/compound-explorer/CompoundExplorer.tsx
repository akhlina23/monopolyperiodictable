import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { ChemicalElement } from '../../types/game';
import { ChemicalCompound, COMPOUNDS_DATABASE } from '../../data/compounds';
import { getCompoundStructure3D } from '../../data/compoundStructures';
import { ELEMENTS_BY_ID } from '../../engine/gameEngine';
import { Box, FlaskConical, Search, Sparkles, X } from 'lucide-react';

const LazyCompoundViewer3D = lazy(() =>
  import('./CompoundViewer3D').then((m) => ({ default: m.CompoundViewer3D }))
);

interface CompoundExplorerProps {
  selectedElement: ChemicalElement;
  onSelectElement: (el: ChemicalElement) => void;
}

type StructureFilter = 'all' | 'covalent' | 'lattice';

export const CompoundExplorer: React.FC<CompoundExplorerProps> = ({
  selectedElement,
  onSelectElement,
}) => {
  const [query, setQuery] = useState('');
  const [filterBySelected, setFilterBySelected] = useState(false);
  const [structureFilter, setStructureFilter] = useState<StructureFilter>('all');
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>('c8h10n4o2');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return COMPOUNDS_DATABASE.filter((c) => {
      const matchesElement =
        !filterBySelected || c.elements.includes(selectedElement.atomicNumber);
      const matchesQuery =
        !q ||
        c.formula.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.nameId.toLowerCase().includes(q) ||
        c.compoundType.toLowerCase().includes(q);
      const struct = getCompoundStructure3D(c.id);
      const matchesStructure =
        structureFilter === 'all' ||
        (structureFilter === 'covalent' && struct?.representation === 'covalent') ||
        (structureFilter === 'lattice' &&
          (struct?.representation === 'ionic_lattice' ||
            struct?.representation === 'covalent_network'));
      return matchesElement && matchesQuery && matchesStructure;
    });
  }, [query, filterBySelected, structureFilter, selectedElement.atomicNumber]);

  // Keep activeCompound synchronized with visible filtered compounds
  const activeCompound: ChemicalCompound | null = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.find((c) => c.id === selectedCompoundId) || filtered[0];
  }, [filtered, selectedCompoundId]);

  useEffect(() => {
    if (activeCompound && activeCompound.id !== selectedCompoundId) {
      setSelectedCompoundId(activeCompound.id);
    }
  }, [activeCompound, selectedCompoundId]);

  const handleSelectAtomElement = (atomicNumber: number) => {
    const el = ELEMENTS_BY_ID[atomicNumber];
    if (el) onSelectElement(el);
  };

  return (
    <div className="bg-[#171820] border border-white/10 rounded-xl p-4 flex flex-col gap-4 h-full">
      {/* Header & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-white/10">
        <div>
          <h3 className="font-display text-base font-bold text-[#F4F1EA] flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#FF8733]" />
            3D Molecular &amp; Crystal Compounds Explorer
          </h3>
          <p className="text-xs text-[#A6A9B7]">
            Select any verified compound to inspect its 3D molecular or crystal geometry, bond lengths, and constituent elements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#09090D] border border-white/10 rounded-lg p-0.5 text-[11px] font-semibold">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'covalent', label: 'Covalent' },
                { id: 'lattice', label: 'Crystal / Network' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStructureFilter(opt.id)}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  structureFilter === opt.id
                    ? 'bg-[#286BFF] text-white'
                    : 'text-[#A6A9B7] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setFilterBySelected((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
              filterBySelected
                ? 'bg-[#7029FF] border-[#7029FF] text-white'
                : 'bg-[#20222D] border-white/10 text-[#A6A9B7] hover:text-white'
            }`}
          >
            Contains {selectedElement.symbol}
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A6A9B7]" />
            <input
              type="text"
              aria-label="Search compounds"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search H2O, Fe2O3, Glucose..."
              className="pl-8 pr-7 py-1.5 rounded-lg bg-[#09090D] border border-white/10 text-xs text-[#F4F1EA] placeholder:text-[#A6A9B7]/60 focus:outline-none focus:border-[#286BFF]"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear compound search"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A6A9B7] hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 || !activeCompound ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#20222D]/50 rounded-xl border border-white/10">
          <p className="text-sm font-semibold text-[#F4F1EA]">
            No matching compounds in verified database.
          </p>
          <p className="text-xs text-[#A6A9B7] mt-1">
            Try clearing the &quot;{selectedElement.symbol}&quot; or structure filter, or search formulas like Fe2O3, SiO2, C6H12O6, or C8H10N4O2.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 min-h-0">
          {/* Single Active Lazy-Loaded 3D Compound Viewer (Only 1 WebGL context mounted) */}
          <Suspense
            fallback={
              <div className="h-[420px] rounded-xl bg-[#09090D] border border-white/15 flex items-center justify-center text-xs text-[#A6A9B7]">
                Loading 3D structure for {activeCompound.formula}...
              </div>
            }
          >
            <LazyCompoundViewer3D
              compound={activeCompound}
              onSelectElement={handleSelectAtomElement}
            />
          </Suspense>

          {/* Selectable Compound Library Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A6A9B7]">
                Verified Compound Structures ({filtered.length})
              </span>
              <span className="text-[11px] text-[#A6A9B7]">
                Active 3D Model:{' '}
                <strong className="font-mono text-[#FF8733]">{activeCompound.formula}</strong>{' '}
                ({activeCompound.nameEn})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {filtered.map((compound) => {
                const isSelected = activeCompound.id === compound.id;
                const struct = getCompoundStructure3D(compound.id);
                const isCrystal =
                  struct?.representation === 'ionic_lattice' ||
                  struct?.representation === 'covalent_network';

                return (
                  <div
                    key={compound.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCompoundId(compound.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedCompoundId(compound.id);
                      }
                    }}
                    className={`rounded-xl p-3 flex flex-col justify-between gap-2 border cursor-pointer transition-all text-left ${
                      isSelected
                        ? 'bg-[#232635] border-[#FF8733] ring-1 ring-[#FF8733]/50 shadow-lg'
                        : 'bg-[#20222D] border-white/10 hover:border-[#286BFF]/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono text-base font-extrabold text-[#FF8733]">
                            {compound.formula}
                          </div>
                          <div className="font-display text-xs font-bold text-[#F4F1EA]">
                            {compound.nameEn}{' '}
                            <span className="text-[11px] font-normal text-[#A6A9B7]">
                              ({compound.nameId})
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-[#09090D] px-2 py-0.5 rounded border border-white/10 text-[#93C5FD] tabular-nums shrink-0">
                          {compound.molarMassGmol} g/mol
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                            isCrystal
                              ? 'bg-[#1D1B2E] border-[#7029FF]/50 text-[#C4B5FD]'
                              : 'bg-[#122238] border-[#286BFF]/50 text-[#93C5FD]'
                          }`}
                        >
                          {isCrystal ? (
                            <Box className="w-2.5 h-2.5" />
                          ) : (
                            <Sparkles className="w-2.5 h-2.5" />
                          )}
                          {struct?.representation === 'ionic_lattice'
                            ? 'Ionic Lattice'
                            : struct?.representation === 'covalent_network'
                            ? 'Covalent Network'
                            : 'Molecular Covalent'}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-mono font-bold text-[#FF8733]">
                            ● Active 3D
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#A6A9B7] mt-1.5 leading-snug line-clamp-2">
                        {compound.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex flex-wrap gap-1">
                        {compound.elements.map((z) => {
                          const el = ELEMENTS_BY_ID[z];
                          if (!el) return null;
                          return (
                            <button
                              key={z}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectElement(el);
                              }}
                              className="px-1.5 py-0.5 rounded bg-[#09090D] hover:bg-[#286BFF] border border-white/15 text-[10px] font-mono font-bold text-[#F4F1EA] cursor-pointer transition-colors"
                              title={`Inspect ${el.nameEn} in Periodic Table`}
                            >
                              {el.atomicNumber} {el.symbol}
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[10px] font-mono text-[#A6A9B7]">
                        {struct ? `${struct.atoms.length} atoms` : 'No 3D'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

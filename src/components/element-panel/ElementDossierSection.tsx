import React from 'react';
import { ChemicalElement } from '../../types/game';
import { DossierLanguage, getElementDossier } from '../../data/elementDossier';
import { BookOpen, Cpu, Globe, Lightbulb } from 'lucide-react';

interface ElementDossierSectionProps {
  element: ChemicalElement;
  language: DossierLanguage;
  onLanguageChange: (lang: DossierLanguage) => void;
}

const SECTION_LABELS: Record<
  DossierLanguage,
  {
    kicker: string;
    historyTitle: string;
    applicationsTitle: string;
    funFactTitle: string;
    missingText: string;
  }
> = {
  id: {
    kicker: 'Arsip Ilmiah & Sejarah Unsur',
    historyTitle: 'Sejarah Singkat Penemuan',
    applicationsTitle: 'Fungsi & Aplikasi Utama',
    funFactTitle: 'Fakta Unik yang Jarang Diketahui',
    missingText: 'Data belum tersedia',
  },
  en: {
    kicker: 'Element Historical & Scientific Dossier',
    historyTitle: 'Brief Discovery History',
    applicationsTitle: 'Key Functions & Applications',
    funFactTitle: 'Lesser-Known Fun Facts',
    missingText: 'Data unavailable',
  },
};

export const ElementDossierSection: React.FC<ElementDossierSectionProps> = ({
  element,
  language,
  onLanguageChange,
}) => {
  const dossier = getElementDossier(element.atomicNumber);
  const labels = SECTION_LABELS[language];

  return (
    <section
      aria-label={labels.kicker}
      className="bg-[#171820] border border-white/10 rounded-xl p-4 flex flex-col gap-3.5"
    >
      {/* Header Row with Clean Unboxed Metadata & ID/EN Language Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-white/10">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#A6A9B7]">
            {labels.kicker}
          </div>
          <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
            <h4 className="font-display text-base font-bold text-[#F4F1EA]">
              {element.symbol} · {element.nameEn}
            </h4>
            <span className="text-xs text-[#A6A9B7]">
              {element.nameId}
              <span aria-hidden="true"> · </span>
              <span className="font-mono tabular-nums">Z = {element.atomicNumber}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono tabular-nums">{element.atomicMassDisplay}</span>
              {element.discoveryYear && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono tabular-nums">{element.discoveryYear}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Bilingual ID / EN Segmented Toggle */}
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-[#A6A9B7]" aria-hidden="true" />
          <div
            role="group"
            aria-label="Dossier language"
            className="flex items-center bg-[#09090D] p-1 rounded-lg border border-white/10 gap-1"
          >
            {(
              [
                { id: 'id', label: 'Indonesia (ID)' },
                { id: 'en', label: 'English (EN)' },
              ] as { id: DossierLanguage; label: string }[]
            ).map((opt) => {
              const active = language === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onLanguageChange(opt.id)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 min-h-[34px] rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#286BFF] text-white'
                      : 'text-[#A6A9B7] hover:text-white hover:bg-[#20222D]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3-Column Structured Dossier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <article className="bg-[#09090D]/75 border border-white/10 rounded-xl p-3.5 flex flex-col gap-2">
          <header className="flex items-center gap-2 text-xs font-bold text-[#60A5FA]">
            <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
            <h5>{labels.historyTitle}</h5>
          </header>
          <p className="text-xs text-[#D1D5DB] leading-relaxed">
            {dossier ? dossier.history[language] : labels.missingText}
          </p>
        </article>

        <article className="bg-[#09090D]/75 border border-white/10 rounded-xl p-3.5 flex flex-col gap-2">
          <header className="flex items-center gap-2 text-xs font-bold text-[#32C48D]">
            <Cpu className="w-4 h-4 shrink-0" aria-hidden="true" />
            <h5>{labels.applicationsTitle}</h5>
          </header>
          <p className="text-xs text-[#D1D5DB] leading-relaxed">
            {dossier ? dossier.applications[language] : labels.missingText}
          </p>
        </article>

        <article className="bg-[#09090D]/75 border border-white/10 rounded-xl p-3.5 flex flex-col gap-2">
          <header className="flex items-center gap-2 text-xs font-bold text-[#F59E0B]">
            <Lightbulb className="w-4 h-4 shrink-0" aria-hidden="true" />
            <h5>{labels.funFactTitle}</h5>
          </header>
          <p className="text-xs text-[#D1D5DB] leading-relaxed">
            {dossier ? dossier.funFact[language] : labels.missingText}
          </p>
        </article>
      </div>
    </section>
  );
};

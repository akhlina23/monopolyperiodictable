import React from 'react';
import {
  BoardTile,
  DEFAULT_ECONOMY_CONFIG,
  EconomyConfig,
  MainPropertyOwnership,
  PropertyOwnership,
  Team,
} from '../types/game';
import {
  CATEGORY_COLORS,
  ELEMENTS_BY_ID,
  MAIN_PROPERTIES_BY_ID,
  calculateAuctionMinimum,
  calculateCompanyBuildCost,
  calculateMaintenance,
  calculatePropertyStartIncome,
  getStartIncomeSchedule,
  getTitleDeedRentSchedule,
} from '../engine/gameEngine';
import { CompanyPreviewViewport } from './board3d/CompanyModel3D';
import { Building2, DollarSign, Gavel, Lock, Trash2, X } from 'lucide-react';

interface TileDetailModalProps {
  tile: BoardTile;
  activeTeam: Team;
  teams: Team[];
  economyConfig?: EconomyConfig;
  ownership?: PropertyOwnership;
  mainOwnership?: MainPropertyOwnership;
  ownerTeam?: Team | null;
  onClose: () => void;
  onBuyElement?: (tileId: string) => void;
  onBuyMainProperty?: (tileId: string) => void;
  onBuildCompany?: (tileId: string) => void;
  onSellCompanies?: (tileId: string) => void;
  onStartAuction?: (tileId: string) => void;
}

export const TileDetailModal: React.FC<TileDetailModalProps> = ({
  tile,
  activeTeam,
  teams,
  economyConfig = DEFAULT_ECONOMY_CONFIG,
  ownership,
  mainOwnership,
  ownerTeam,
  onClose,
  onBuyElement,
  onBuyMainProperty,
  onBuildCompany,
  onSellCompanies,
  onStartAuction,
}) => {
  const isElement = tile.tileType === 'element' && tile.atomicNumber;
  const element = isElement ? ELEMENTS_BY_ID[tile.atomicNumber!] : null;
  const isOwner = ownership && ownership.ownerTeamId === activeTeam.id;
  const isStandingHere = activeTeam.position === tile.pathIndex;

  if (isElement && element) {
    const colors = CATEGORY_COLORS[element.category || 'Lainnya'] || CATEGORY_COLORS['Lainnya'];
    const rentSchedule = getTitleDeedRentSchedule(element.basePriceKK, economyConfig);
    const incomeSchedule = getStartIncomeSchedule(element.basePriceKK, economyConfig);
    const buildInfo = calculateCompanyBuildCost(ownership, element, economyConfig);
    const maintenanceCostKK = calculateMaintenance(element.basePriceKK, economyConfig);
    const auctionMinKK = calculateAuctionMinimum(element.basePriceKK, economyConfig);

    const smallCount = ownership?.smallCompanies ?? 0;
    const hasBig = ownership?.hasLargeCompany ?? false;

    const currentStage = hasBig
      ? '1 Big Company'
      : smallCount > 0
      ? `${smallCount} Small Compan${smallCount > 1 ? 'ies' : 'y'}`
      : 'No Companies';

    const currentIncomeKK = ownership
      ? calculatePropertyStartIncome(element.basePriceKK, smallCount, hasBig, economyConfig)
      : 0;

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#09090D]/85 p-3 sm:p-6">
        <div className="bg-[#171820] border border-white/15 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
          {/* Title Deed Header */}
          <div
            style={{ backgroundColor: colors.bg, borderBottomColor: colors.border }}
            className="px-5 py-4 border-b flex justify-between items-start gap-3"
          >
            <div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: colors.text }}>
                TITLE DEED · {element.category} · Z = {element.atomicNumber}
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="font-display text-3xl sm:text-4xl font-extrabold text-white">
                  {element.symbol}
                </span>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-[#F4F1EA] leading-tight">
                    {element.nameEn}
                  </div>
                  <div className="text-xs text-[#A6A9B7]">{element.nameId}</div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-[#09090D]/60 hover:bg-[#09090D] text-[#A6A9B7] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Spacious 2-Column Property Panel: Left 3D Company Model + Core Identity, Right Financial Schedules */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-y-auto tabular-nums text-xs">
            {/* Left Column: 3D Company Model Viewport & Summary */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <CompanyPreviewViewport
                element={element}
                smallCompanies={smallCount}
                hasLargeCompany={hasBig}
              />

              <div className="grid grid-cols-2 gap-2 bg-[#20222D] p-3 rounded-xl border border-white/10">
                <div>
                  <span className="text-[#A6A9B7] text-[10px] block">Board Track</span>
                  <strong className="font-mono text-[#286BFF] text-sm">Tile #{tile.pathIndex} / 129</strong>
                </div>
                <div>
                  <span className="text-[#A6A9B7] text-[10px] block">Purchase Price</span>
                  <strong className="font-mono text-[#FF8733] text-sm">
                    {element.basePriceKK.toLocaleString('id-ID')} KK
                  </strong>
                </div>
                <div>
                  <span className="text-[#A6A9B7] text-[10px] block">Auction Min (70%)</span>
                  <strong className="font-mono text-[#F4F1EA]">
                    {auctionMinKK.toLocaleString('id-ID')} KK
                  </strong>
                </div>
                <div>
                  <span className="text-[#A6A9B7] text-[10px] block">Owner</span>
                  {ownerTeam ? (
                    <strong className="flex items-center gap-1.5 truncate" style={{ color: ownerTeam.color }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ownerTeam.color }} />
                      <span className="truncate">{ownerTeam.name}</span>
                    </strong>
                  ) : (
                    <strong className="text-[#32C48D]">Available (Bank)</strong>
                  )}
                </div>
              </div>

              <div className="bg-[#20222D] p-3 rounded-xl border border-white/10 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#A6A9B7]">Small Company Cost (2/3 base)</span>
                  <strong className="font-mono text-[#F4F1EA]">
                    {incomeSchedule.smallCompanyUnitCostKK.toLocaleString('id-ID')} KK
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A6A9B7]">Current START Income</span>
                  <strong className="font-mono text-[#32C48D]">
                    {currentIncomeKK.toLocaleString('id-ID')} KK / START
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A6A9B7]">Own-Tile Maintenance (2× base)</span>
                  <strong className="font-mono text-[#F45B69]">
                    {maintenanceCostKK.toLocaleString('id-ID')} KK
                  </strong>
                </div>
              </div>
            </div>

            {/* Right Column: Rent Tiers + START Income Schedule (120%-200%) + Actions */}
            <div className="md:col-span-7 flex flex-col gap-3">
              <div className="border border-white/10 rounded-xl overflow-hidden bg-[#20222D]">
                <div className="bg-[#09090D]/60 px-3 py-2 font-bold text-[#A6A9B7] text-[11px] border-b border-white/10 grid grid-cols-12">
                  <span className="col-span-6">Level ({currentStage})</span>
                  <span className="col-span-3 text-right">Rent</span>
                  <span className="col-span-3 text-right text-[#32C48D]">START Income</span>
                </div>
                <div className="divide-y divide-white/5 text-[11px]">
                  {[
                    {
                      label: 'No Company (Base 1×)',
                      rent: rentSchedule.baseRentKK,
                      inc: 0,
                      active: currentStage === 'No Companies',
                    },
                    {
                      label: '1 Small (Rent 5× · Inc 120%)',
                      rent: rentSchedule.oneSmallKK,
                      inc: incomeSchedule.oneSmallIncomeKK,
                      active: currentStage === '1 Small Company',
                    },
                    {
                      label: '2 Small (Rent 15× · Inc 140%)',
                      rent: rentSchedule.twoSmallKK,
                      inc: incomeSchedule.twoSmallIncomeKK,
                      active: currentStage === '2 Small Companies',
                    },
                    {
                      label: '3 Small (Rent 43× · Inc 160%)',
                      rent: rentSchedule.threeSmallKK,
                      inc: incomeSchedule.threeSmallIncomeKK,
                      active: currentStage === '3 Small Companies',
                    },
                    {
                      label: '4 Small (Rent 60× · Inc 180%)',
                      rent: rentSchedule.fourSmallKK,
                      inc: incomeSchedule.fourSmallIncomeKK,
                      active: currentStage === '4 Small Companies',
                    },
                    {
                      label: 'Big Company (Rent 75× · Inc 200%)',
                      rent: rentSchedule.bigCompanyKK,
                      inc: incomeSchedule.bigCompanyIncomeKK,
                      active: currentStage === '1 Big Company',
                      highlight: true,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className={`px-3 py-2 grid grid-cols-12 items-center ${
                        row.active ? 'bg-[#7029FF]/25 text-white font-bold' : 'text-[#A6A9B7]'
                      }`}
                    >
                      <span className={`col-span-6 ${row.highlight ? 'text-[#FF8733] font-semibold' : ''}`}>
                        {row.label}
                      </span>
                      <span className="col-span-3 text-right font-mono text-[#F4F1EA]">
                        {row.rent.toLocaleString('id-ID')}
                      </span>
                      <span className="col-span-3 text-right font-mono text-[#32C48D]">
                        {row.inc > 0 ? `+${row.inc.toLocaleString('id-ID')}` : '0'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 mt-auto">
                {!ownership && onBuyElement && (
                  isStandingHere ? (
                    <button
                      type="button"
                      disabled={activeTeam.balanceKK < element.basePriceKK}
                      onClick={() => onBuyElement(tile.tileId)}
                      className="w-full py-2.5 bg-[#286BFF] hover:bg-[#1D57DC] disabled:opacity-45 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    >
                      <DollarSign className="w-4 h-4" /> Buy Property ({element.basePriceKK.toLocaleString('id-ID')} KK)
                    </button>
                  ) : (
                    <div className="w-full py-2.5 px-3 rounded-xl bg-[#20222D] border border-white/10 text-[#A6A9B7] text-[11px] flex items-center justify-center gap-2 text-center">
                      <Lock className="w-3.5 h-3.5 text-[#FF8733] shrink-0" />
                      <span>
                        Inspection only — {activeTeam.name} must land on Tile #{tile.pathIndex} to purchase.
                      </span>
                    </div>
                  )
                )}

                {isOwner && buildInfo.canBuild && onBuildCompany && (
                  <button
                    type="button"
                    disabled={activeTeam.balanceKK < buildInfo.costKK}
                    onClick={() => onBuildCompany(tile.tileId)}
                    className="w-full py-2.5 bg-[#FF8733] hover:bg-[#E67222] disabled:opacity-45 text-[#09090D] font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Building2 className="w-4 h-4" />
                    {buildInfo.type === 'small'
                      ? `Build Small Company (${buildInfo.costKK.toLocaleString('id-ID')} KK)`
                      : `Upgrade to Big Company (${buildInfo.costKK.toLocaleString('id-ID')} KK)`}
                  </button>
                )}

                {isOwner && (smallCount > 0 || hasBig) && onSellCompanies && (
                  <button
                    type="button"
                    onClick={() => onSellCompanies(tile.tileId)}
                    className="w-full py-2 bg-[#20222D] hover:bg-[#2C2F3D] border border-white/15 text-[#F4F1EA] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#F5B942]" /> Sell Buildings (50% Refund) to Clean Deed
                  </button>
                )}

                {isOwner && onStartAuction && (
                  <button
                    type="button"
                    onClick={() => onStartAuction(tile.tileId)}
                    className="w-full py-2.5 bg-[#7029FF] hover:bg-[#5E1FE0] text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Gavel className="w-4 h-4" /> Auction Clean Deed (Min {auctionMinKK.toLocaleString('id-ID')} KK)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Property (Utilities)
  if (tile.tileType === 'main_property' && tile.mainPropertyId) {
    const def = MAIN_PROPERTIES_BY_ID[tile.mainPropertyId];
    const mainOwner = mainOwnership ? teams.find((t) => t.id === mainOwnership.ownerTeamId) : null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090D]/85 p-4">
        <div className="bg-[#171820] border border-[#FF8733]/40 rounded-2xl shadow-2xl max-w-md w-full p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#FF8733] font-bold">
                Main Infrastructure Property (DRAFT)
              </span>
              <h2 className="font-display text-lg font-bold text-[#F4F1EA]">{def?.name || tile.title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#20222D] text-[#A6A9B7] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-[#20222D] p-3 rounded-xl border border-white/10 text-xs space-y-1.5 tabular-nums">
            <div className="flex justify-between">
              <span className="text-[#A6A9B7]">Track Position:</span>
              <strong className="font-mono text-[#286BFF]">Tile #{tile.pathIndex} / 129</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A6A9B7]">Purchase Price:</span>
              <strong className="font-mono text-[#FF8733]">
                {def?.draftPurchasePriceKK.toLocaleString('id-ID')} KK
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A6A9B7]">Visitor Bank Charge:</span>
              <strong className="font-mono text-[#F4F1EA]">
                {def?.draftBankTaxMaintenanceKK.toLocaleString('id-ID')} KK
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A6A9B7]">Owner:</span>
              <strong style={{ color: mainOwner?.color || '#32C48D' }}>
                {mainOwner ? mainOwner.name : 'Available (Bank)'}
              </strong>
            </div>
          </div>

          {!mainOwnership && onBuyMainProperty && def && (
            isStandingHere ? (
              <button
                type="button"
                disabled={activeTeam.balanceKK < def.draftPurchasePriceKK}
                onClick={() => onBuyMainProperty(tile.tileId)}
                className="w-full py-2.5 bg-[#286BFF] hover:bg-[#1D57DC] disabled:opacity-45 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Buy Main Property ({def.draftPurchasePriceKK.toLocaleString('id-ID')} KK)
              </button>
            ) : (
              <div className="py-2 px-3 rounded-xl bg-[#20222D] border border-white/10 text-[#A6A9B7] text-[11px] flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#FF8733]" />
                <span>Land on Tile #{tile.pathIndex} to purchase.</span>
              </div>
            )
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-[#20222D] hover:bg-[#2C2F3D] text-[#F4F1EA] font-bold rounded-xl text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090D]/85 p-4">
      <div className="bg-[#171820] border border-white/15 rounded-2xl shadow-2xl max-w-sm w-full p-5 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="font-display text-base font-bold text-[#F4F1EA]">{tile.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#20222D] text-[#A6A9B7] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-[#20222D] p-3 rounded-xl border border-white/10 text-xs text-[#A6A9B7] leading-relaxed">
          Track Position: <strong className="font-mono text-[#F4F1EA]">#{tile.pathIndex} / 129</strong>
          <br />
          Tile Type: <strong className="text-[#FF8733]">{tile.tileType.toUpperCase()}</strong>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-[#286BFF] hover:bg-[#1D57DC] text-white font-bold rounded-xl text-xs cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};

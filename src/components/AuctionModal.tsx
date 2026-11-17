import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AuctionState, ChemicalElement, Team } from '../types/game';
import { CheckCircle, Gavel, TrendingDown, TrendingUp, XCircle } from 'lucide-react';

interface AuctionModalProps {
  auction: AuctionState;
  element: ChemicalElement;
  teams: Team[];
  onPlaceBid: (bidderTeamId: string, amountKK: number) => void;
  onFinishAuction: () => void;
  onRejectAuction: () => void;
}

export const AuctionModal: React.FC<AuctionModalProps> = ({
  auction,
  element,
  teams,
  onPlaceBid,
  onFinishAuction,
  onRejectAuction,
}) => {
  const sellerTeam = teams.find((t) => t.id === auction.sellerTeamId);
  const highestBidderTeam = teams.find((t) => t.id === auction.highestBidderTeamId);
  const eligibleBidders = useMemo(
    () => teams.filter((t) => t.id !== auction.sellerTeamId && !t.isBankrupt),
    [teams, auction.sellerTeamId]
  );

  const floorMinBid = auction.minimumBidKK ?? element.auctionMinimumKK;
  const offersByTeam = auction.offersByTeam || {};

  const [selectedBidderId, setSelectedBidderId] = useState<string>(eligibleBidders[0]?.id || '');
  const currentTeamOffer = selectedBidderId ? offersByTeam[selectedBidderId] : undefined;

  const [bidInput, setBidInput] = useState<string>(
    String(
      currentTeamOffer ??
        (auction.highestBidderTeamId ? auction.currentBidKK + auction.minIncrementKK : floorMinBid)
    )
  );

  // Sync input sensibly when switching team
  useEffect(() => {
    if (!selectedBidderId) return;
    const teamOffer = offersByTeam[selectedBidderId];
    if (typeof teamOffer === 'number') {
      setBidInput(String(teamOffer));
    } else {
      const suggested = auction.highestBidderTeamId
        ? auction.currentBidKK + auction.minIncrementKK
        : floorMinBid;
      setBidInput(String(suggested));
    }
  }, [selectedBidderId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!eligibleBidders.some((t) => t.id === selectedBidderId)) {
      setSelectedBidderId(eligibleBidders[0]?.id || '');
    }
  }, [eligibleBidders, selectedBidderId]);

  const selectedBidder = teams.find((t) => t.id === selectedBidderId);
  const parsedBid = Number(bidInput);
  const normalizedBid = Number.isFinite(parsedBid) ? Math.round(parsedBid) : NaN;

  let validationError: string | null = null;
  if (!selectedBidder) {
    validationError = 'Select an eligible team to submit or revise an offer.';
  } else if (!Number.isFinite(normalizedBid) || normalizedBid <= 0) {
    validationError = 'Enter a valid positive Koin Kimia offer.';
  } else if (normalizedBid < floorMinBid) {
    validationError = `Offer cannot be below the 70% minimum (${floorMinBid.toLocaleString('id-ID')} KK).`;
  } else if (normalizedBid > selectedBidder.balanceKK) {
    validationError = `Insufficient funds: ${selectedBidder.name} has ${selectedBidder.balanceKK.toLocaleString('id-ID')} KK.`;
  }

  const canSubmitOffer = !validationError && Boolean(selectedBidder);
  const hasAnyValidOffer = Boolean(auction.highestBidderTeamId);

  const handleSubmitOffer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSubmitOffer || !selectedBidder) return;
    onPlaceBid(selectedBidder.id, normalizedBid);
  };

  const adjustInput = (delta: number) => {
    const base = Number.isFinite(normalizedBid) ? normalizedBid : floorMinBid;
    const maxCap = selectedBidder ? selectedBidder.balanceKK : base + Math.abs(delta);
    const next = Math.max(floorMinBid, Math.min(maxCap, base + delta));
    setBidInput(String(next));
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Property Auction for ${element.nameEn}`}
      className="fixed inset-0 z-[9999] overflow-y-auto bg-[#07080D]/88 p-3 sm:p-6 flex items-start sm:items-center justify-center"
    >
      <div className="bg-[#171820] border border-[#286BFF]/60 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="bg-[#20222D] border-b border-white/10 px-5 py-4 flex justify-between items-start gap-3 shrink-0">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#286BFF]/25 text-[#93C5FD] font-bold">
              Clean Property Auction · 70% Floor · Local Shared Console
            </span>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#F4F1EA] mt-1.5">
              {element.symbol} — {element.nameEn} (#{element.atomicNumber})
            </h2>
            <p className="text-[11px] text-[#A6A9B7]">{element.nameId}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#286BFF]/20 border border-[#286BFF]/40 text-[#93C5FD] shrink-0">
            <Gavel className="w-5 h-5" />
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 text-xs tabular-nums overflow-y-auto">
          {/* Property & Seller Metadata */}
          <div className="grid grid-cols-3 gap-2.5 bg-[#20222D] p-3.5 rounded-xl border border-white/10">
            <div>
              <span className="text-[#A6A9B7] block text-[10px] uppercase tracking-wider">Previous Owner</span>
              <strong className="text-[#F4F1EA] flex items-center gap-1.5 mt-0.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: sellerTeam?.color || '#9CA3AF' }}
                />
                <span className="truncate">{sellerTeam?.name || 'Seller'}</span>
              </strong>
            </div>
            <div>
              <span className="text-[#A6A9B7] block text-[10px] uppercase tracking-wider">Original Price</span>
              <strong className="font-mono text-[#F4F1EA] text-sm mt-0.5 block">
                {element.basePriceKK.toLocaleString('id-ID')} KK
              </strong>
            </div>
            <div>
              <span className="text-[#A6A9B7] block text-[10px] uppercase tracking-wider">Minimum Bid (70%)</span>
              <strong className="font-mono text-[#FF8733] text-sm mt-0.5 block">
                {floorMinBid.toLocaleString('id-ID')} KK
              </strong>
            </div>
          </div>

          {/* Current Highest Offer Banner */}
          <div className="bg-[#152238] border border-[#294E8A] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-mono text-[#93C5FD] font-bold uppercase tracking-wider block">
                Current Highest Bid
              </span>
              <div className="font-mono text-2xl font-extrabold text-white mt-0.5">
                {hasAnyValidOffer ? `${auction.currentBidKK.toLocaleString('id-ID')} KK` : 'No offers yet'}
              </div>
            </div>
            <div className="text-center sm:text-right">
              <span className="text-[10px] font-mono text-[#A6A9B7] uppercase tracking-wider block">
                Leading Team
              </span>
              {highestBidderTeam ? (
                <div className="inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-lg bg-[#09090D]/70 border border-white/15">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: highestBidderTeam.color }}
                  />
                  <strong className="text-sm text-[#86EFAC]">{highestBidderTeam.name}</strong>
                </div>
              ) : (
                <strong className="text-xs text-[#A6A9B7] mt-1 block">Minimum {floorMinBid.toLocaleString('id-ID')} KK</strong>
              )}
            </div>
          </div>

          {/* Eligible Teams & Current Offers Matrix */}
          <div className="bg-[#20222D] border border-white/10 rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-[#F4F1EA] text-xs">
                Eligible Bidding Teams &amp; Active Offers
              </span>
              <span className="text-[10px] text-[#A6A9B7]">
                Select any team to place, raise, or reduce its offer
              </span>
            </div>

            {eligibleBidders.length === 0 ? (
              <div className="p-3 rounded-lg bg-[#09090D] border border-white/10 text-[#A6A9B7] text-center">
                No eligible solvent bidding teams available.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {eligibleBidders.map((t) => {
                  const isSelected = selectedBidderId === t.id;
                  const isLeader = auction.highestBidderTeamId === t.id;
                  const teamOffer = offersByTeam[t.id];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedBidderId(t.id)}
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#286BFF]/25 border-[#286BFF] text-white'
                          : 'bg-[#09090D]/80 border-white/10 text-[#A6A9B7] hover:text-white hover:border-white/25'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#F4F1EA] truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                          <span className="truncate">{t.name}</span>
                          {isLeader && (
                            <span className="px-1.5 py-0.5 rounded bg-[#14291D] border border-[#236942] text-[#86EFAC] text-[9px] font-mono">
                              LEADER
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#A6A9B7] font-mono mt-0.5">
                          Balance: {t.balanceKK.toLocaleString('id-ID')} KK
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] text-[#A6A9B7] uppercase block">Offer</span>
                        <strong
                          className={`font-mono text-xs ${
                            typeof teamOffer === 'number' ? 'text-[#FF8733]' : 'text-[#A6A9B7]/60'
                          }`}
                        >
                          {typeof teamOffer === 'number'
                            ? `${teamOffer.toLocaleString('id-ID')} KK`
                            : '—'}
                        </strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Editable Bid Input + Increase/Decrease Controls */}
            {selectedBidder && (
              <form onSubmit={handleSubmitOffer} className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-[#A6A9B7]">
                    Submitting for <strong className="text-white">{selectedBidder.name}</strong>
                    {typeof currentTeamOffer === 'number' && (
                      <span className="ml-1.5 font-mono text-[#FF8733]">
                        (Current: {currentTeamOffer.toLocaleString('id-ID')} KK)
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <button
                      type="button"
                      onClick={() => adjustInput(-500)}
                      className="px-2 py-1 rounded bg-[#09090D] hover:bg-[#343946] border border-white/10 text-[#F4F1EA] cursor-pointer"
                    >
                      -500
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustInput(-100)}
                      className="px-2 py-1 rounded bg-[#09090D] hover:bg-[#343946] border border-white/10 text-[#F4F1EA] cursor-pointer"
                    >
                      -100
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustInput(100)}
                      className="px-2 py-1 rounded bg-[#09090D] hover:bg-[#343946] border border-white/10 text-[#F4F1EA] cursor-pointer"
                    >
                      +100
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustInput(500)}
                      className="px-2 py-1 rounded bg-[#09090D] hover:bg-[#343946] border border-white/10 text-[#F4F1EA] cursor-pointer"
                    >
                      +500
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    aria-label="Offer amount in Koin Kimia"
                    step={100}
                    min={floorMinBid}
                    max={selectedBidder.balanceKK}
                    value={bidInput}
                    onChange={(e) => setBidInput(e.target.value)}
                    className="w-full px-3 py-2.5 border border-white/15 rounded-xl text-sm font-mono font-bold bg-[#09090D] text-white focus:outline-none focus:border-[#286BFF]"
                  />
                  <button
                    type="submit"
                    disabled={!canSubmitOffer}
                    className="px-4 py-2.5 bg-[#286BFF] hover:bg-[#1D57DC] disabled:opacity-45 text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    {typeof currentTeamOffer === 'number' && normalizedBid < currentTeamOffer ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                    <span>{typeof currentTeamOffer === 'number' ? 'Update Offer' : 'Place Bid'}</span>
                  </button>
                </div>

                {validationError && (
                  <p className="text-[11px] text-[#FCA5A5] font-medium">{validationError}</p>
                )}
              </form>
            )}
          </div>

          {/* Seller Decision Controls */}
          <div className="bg-[#09090D]/80 border border-white/10 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#A6A9B7]">
                Seller Decision (<strong className="text-[#F4F1EA]">{sellerTeam?.name}</strong>):
              </span>
              <span className="text-[#A6A9B7] font-mono">
                {hasAnyValidOffer
                  ? `Transfer clean deed to ${highestBidderTeam?.name}`
                  : 'Accept enabled once an offer ≥ 70% is placed'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={!hasAnyValidOffer}
                onClick={onFinishAuction}
                className="py-2.5 px-4 rounded-xl bg-[#32C48D] hover:bg-[#24A977] disabled:opacity-40 text-[#09090D] font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {hasAnyValidOffer
                    ? `Accept (${auction.currentBidKK.toLocaleString('id-ID')} KK)`
                    : 'Accept Highest Offer'}
                </span>
              </button>

              <button
                type="button"
                onClick={onRejectAuction}
                className="py-2.5 px-4 rounded-xl bg-[#3B161B] hover:bg-[#521D24] border border-[#F45B69]/40 text-[#FCA5A5] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject &amp; Keep Property</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

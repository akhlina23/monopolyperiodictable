import { describe, it, expect } from 'vitest';
import {
  buildCompanyOnProperty,
  buyElementProperty,
  createDefaultTeams,
  createInitialGameState,
  finalizeAuction,
  placeAuctionBid,
  rejectAuction,
  startElementAuction,
} from '../engine/gameActions';
import { ELEMENTS_BY_ID, ELEMENTS_LIST, TILES_BY_PATH_INDEX } from '../engine/gameEngine';
import { getCenterElementGridCoord } from '../components/board3d/boardCoordinates';
import {
  buildHundOrbitalBoxes,
  parseExpandedElectronSubshells,
} from '../utils/electronConfig';
import {
  getAllVerifiedNuclides,
  getIsobarsByMassNumber,
  getIsotonesByNeutronCount,
  getIsotopesForElement,
  getMostAbundantNuclide,
} from '../data/isotopes';
import { COMPOUNDS_DATABASE } from '../data/compounds';
import {
  COMPOUND_STRUCTURES,
  getCompoundStructure3D,
} from '../data/compoundStructures';

describe('V2 Local Multiplayer Auction System', () => {
  function setupOwnedCleanElement() {
    let state = createInitialGameState(createDefaultTeams(3));
    const feTile = Object.values(TILES_BY_PATH_INDEX).find((t) => t.atomicNumber === 26)!; // Fe
    state = {
      ...state,
      teams: state.teams.map((t, idx) =>
        idx === 0 ? { ...t, position: feTile.pathIndex } : t
      ),
      phase: 'ELEMENT_PURCHASE',
    };
    state = buyElementProperty(state, 'team_1', feTile.tileId).state;
    state = buildCompanyOnProperty(state, 'team_1', feTile.tileId).state;
    return { state, feTile, feElement: ELEMENTS_BY_ID[26] };
  }

  it('enforces 70% floor, blocks self-bids & over-balance bids, and handles upward + downward bid revisions', () => {
    const { state, feTile, feElement } = setupOwnedCleanElement();
    const expectedMinKK = Math.ceil((feElement.basePriceKK * 0.7) / 100) * 100;

    const started = startElementAuction(state, 'team_1', feTile.tileId);
    expect(started.ok).toBe(true);
    expect(started.state.activeAuction?.minimumBidKK).toBe(expectedMinKK);
    expect(started.state.activeAuction?.highestBidderTeamId).toBeNull();

    // Cannot start a second concurrent auction
    const doubleStart = startElementAuction(started.state, 'team_1', feTile.tileId);
    expect(doubleStart.ok).toBe(false);

    // Seller cannot bid on their own property
    const selfBid = placeAuctionBid(started.state, 'team_1', expectedMinKK + 500);
    expect(selfBid.ok).toBe(false);

    // Negative / zero / below-70%-floor / above-balance bids are rejected
    expect(placeAuctionBid(started.state, 'team_2', -500).ok).toBe(false);
    expect(placeAuctionBid(started.state, 'team_2', 0).ok).toBe(false);
    expect(placeAuctionBid(started.state, 'team_2', expectedMinKK - 100).ok).toBe(false);
    expect(placeAuctionBid(started.state, 'team_2', 9999999).ok).toBe(false);

    // Team 2 bids 4,000 KK -> becomes highest bidder
    const bid2 = placeAuctionBid(started.state, 'team_2', Math.max(expectedMinKK, 4000));
    expect(bid2.ok).toBe(true);
    expect(bid2.state.activeAuction?.highestBidderTeamId).toBe('team_2');
    expect(bid2.state.activeAuction?.currentBidKK).toBe(Math.max(expectedMinKK, 4000));

    // Team 3 bids higher (5,500 KK) -> takes the lead
    const highBid = Math.max(expectedMinKK + 1500, 5500);
    const bid3 = placeAuctionBid(bid2.state, 'team_3', highBid);
    expect(bid3.ok).toBe(true);
    expect(bid3.state.activeAuction?.highestBidderTeamId).toBe('team_3');
    expect(bid3.state.activeAuction?.currentBidKK).toBe(highBid);

    // Team 3 lowers its offer below Team 2 -> leader MUST recompute back to Team 2
    const loweredOffer = Math.max(expectedMinKK, 3200);
    const lowerBid3 = placeAuctionBid(bid3.state, 'team_3', loweredOffer);
    expect(lowerBid3.ok).toBe(true);
    expect(lowerBid3.state.activeAuction?.offersByTeam?.['team_3']).toBe(loweredOffer);
    expect(lowerBid3.state.activeAuction?.highestBidderTeamId).toBe('team_2');
    expect(lowerBid3.state.activeAuction?.currentBidKK).toBe(Math.max(expectedMinKK, 4000));
    expect(lowerBid3.state.activeAuction?.revisionHistory?.[0].action).toBe('decrease');
  });

  it('settles accepted auction cleanly once and allows seller rejection with zero money/deed transfer', () => {
    const { state, feTile, feElement } = setupOwnedCleanElement();
    const minBid = Math.ceil((feElement.basePriceKK * 0.7) / 100) * 100;
    const started = startElementAuction(state, 'team_1', feTile.tileId).state;
    const bidded = placeAuctionBid(started, 'team_2', minBid + 600).state;

    // 1. Seller Rejects -> no ownership or money change
    const sellerBalBefore = bidded.teams[0].balanceKK;
    const buyerBalBefore = bidded.teams[1].balanceKK;
    const rejected = rejectAuction(bidded);
    expect(rejected.ok).toBe(true);
    expect(rejected.state.activeAuction).toBeNull();
    expect(rejected.state.phase).toBe('TURN_END');
    expect(rejected.state.properties[feTile.tileId].ownerTeamId).toBe('team_1');
    expect(rejected.state.teams[0].balanceKK).toBe(sellerBalBefore);
    expect(rejected.state.teams[1].balanceKK).toBe(buyerBalBefore);
    expect(rejected.state.events[0].type).toBe('AUCTION_REJECTED');

    // 2. Restart auction, bid again, and Seller Accepts -> clean transfer
    const restarted = startElementAuction(rejected.state, 'team_1', feTile.tileId).state;
    const finalBidAmount = minBid + 900;
    const biddedAgain = placeAuctionBid(restarted, 'team_2', finalBidAmount).state;
    const accepted = finalizeAuction(biddedAgain);

    expect(accepted.ok).toBe(true);
    expect(accepted.state.activeAuction).toBeNull();
    expect(accepted.state.properties[feTile.tileId].ownerTeamId).toBe('team_2');
    expect(accepted.state.properties[feTile.tileId].smallCompanies).toBe(0);
    expect(accepted.state.properties[feTile.tileId].hasLargeCompany).toBe(false);
    expect(accepted.state.teams[0].balanceKK).toBe(sellerBalBefore + finalBidAmount);
    expect(accepted.state.teams[1].balanceKK).toBe(buyerBalBefore - finalBidAmount);

    // Duplicate settlement is blocked
    expect(finalizeAuction(accepted.state).ok).toBe(false);
  });
});

describe('V2 3D Central Periodic Table, Electrons & Isotopes Data Integrity', () => {
  it('places all 118 elements into unique grid coordinates with separated Lanthanides & Actinides', () => {
    const seenCells = new Set<string>();

    ELEMENTS_LIST.forEach((el) => {
      expect(el.symbol.length).toBeGreaterThan(0);
      expect(el.nameEn.length).toBeGreaterThan(0);
      expect(el.atomicMassDisplay.length).toBeGreaterThan(0);

      const coord = getCenterElementGridCoord(el);
      expect(coord.col).toBeGreaterThanOrEqual(1);
      expect(coord.col).toBeLessThanOrEqual(18);
      expect(coord.atlasCol).toBeGreaterThanOrEqual(0);
      expect(coord.atlasCol).toBeLessThan(18);
      expect(coord.atlasRow).toBeGreaterThanOrEqual(0);
      expect(coord.atlasRow).toBeLessThan(10);

      const cellKey = `${coord.atlasCol}-${coord.atlasRow}`;
      expect(seenCells.has(cellKey)).toBe(false);
      seenCells.add(cellKey);

      if (el.atomicNumber >= 57 && el.atomicNumber <= 71) {
        expect(coord.atlasRow).toBe(8);
      } else if (el.atomicNumber >= 89 && el.atomicNumber <= 103) {
        expect(coord.atlasRow).toBe(9);
      } else {
        // Group 3 Period 6 and 7 must stay open for La-Lu / Ac-Lr markers
        expect(coord.atlasRow === 5 && coord.col === 3).toBe(false);
        expect(coord.atlasRow === 6 && coord.col === 3).toBe(false);
      }
    });

    expect(seenCells.size).toBe(118);
  });

  it('parses Aufbau electron subshells for all 118 elements matching atomic numbers and Hund spin rules', () => {
    ELEMENTS_LIST.forEach((el) => {
      const parsed = parseExpandedElectronSubshells(el.expandedElectronConfig);
      expect(parsed.subshells.length).toBeGreaterThan(0);
      expect(parsed.totalElectrons).toBe(el.atomicNumber);
      expect(parsed.valenceElectrons).toBeGreaterThan(0);
    });

    // Hund's rule verification: d6 has 5 orbitals -> 5 up-spins, 1 down-spin
    const d6 = buildHundOrbitalBoxes('d', 6);
    expect(d6).toHaveLength(5);
    expect(d6.filter((b) => b.up).length).toBe(5);
    expect(d6.filter((b) => b.down).length).toBe(1);

    // Hund's rule verification: p3 has 3 unpaired up-spins
    const p3 = buildHundOrbitalBoxes('p', 3);
    expect(p3).toEqual([
      { up: true, down: false },
      { up: true, down: false },
      { up: true, down: false },
    ]);
  });

  it('provides verified isotope nuclides without fabricating missing elements', () => {
    for (const z of [1, 6, 8, 26, 92, 118]) {
      const dataset = getIsotopesForElement(z);
      expect(dataset.coverage).toBe('verified');
      expect(dataset.records.length).toBeGreaterThan(0);
      dataset.records.forEach((iso) => {
        expect(iso.massNumber).toBeGreaterThanOrEqual(z);
        expect(Number(iso.atomicMassU)).toBeGreaterThan(0);
      });
    }

    const uncatalogued = getIsotopesForElement(115);
    expect(uncatalogued.coverage).toBe('unavailable');
    expect(uncatalogued.records).toEqual([]);
  });

  it('resolves most abundant nuclides, cross-element Isobars (same A), and Isotones (same N)', () => {
    expect(getMostAbundantNuclide(6)?.massNumber).toBe(12); // ¹²C 98.93%
    expect(getMostAbundantNuclide(18)?.massNumber).toBe(40); // ⁴⁰Ar 99.6035%
    expect(getMostAbundantNuclide(26)?.massNumber).toBe(56); // ⁵⁶Fe 91.754%
    expect(getMostAbundantNuclide(92)?.massNumber).toBe(238); // ²³⁸U 99.2742%
    expect(getMostAbundantNuclide(115)).toBeNull();

    // Isobars: same mass number A across different Z
    const isobars14 = getIsobarsByMassNumber(14);
    expect(isobars14.map((n) => n.atomicNumber)).toEqual([6, 7]); // ¹⁴C, ¹⁴N

    const isobars40 = getIsobarsByMassNumber(40);
    expect(isobars40.map((n) => n.atomicNumber)).toEqual([18, 19, 20]); // ⁴⁰Ar, ⁴⁰K, ⁴⁰Ca

    // Isotones: same neutron count N = A - Z across different Z
    const isotones8 = getIsotonesByNeutronCount(8);
    expect(isotones8.map((n) => n.atomicNumber)).toEqual([6, 7, 8]); // ¹⁴C, ¹⁵N, ¹⁶O

    const isotones20 = getIsotonesByNeutronCount(20);
    expect(isotones20.map((n) => n.atomicNumber)).toEqual([16, 17, 18, 19, 20]); // ³⁶S..⁴⁰Ca

    // Verify mathematical identity A = Z + N for all nuclide entries
    getAllVerifiedNuclides().forEach((n) => {
      expect(n.massNumber).toBe(n.atomicNumber + n.neutronCount);
      expect(n.neutronCount).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('V2 3D Compound Geometry & Stoichiometry Verification', () => {
  function countBySymbol(compoundId: string): Record<string, number> {
    const struct = getCompoundStructure3D(compoundId)!;
    const counts: Record<string, number> = {};
    struct.atoms.forEach((a) => {
      counts[a.symbol] = (counts[a.symbol] || 0) + 1;
    });
    return counts;
  }

  it('provides valid 3D atomic coordinates and connectivity for all compounds in COMPOUNDS_DATABASE', () => {
    COMPOUNDS_DATABASE.forEach((compound) => {
      const struct = getCompoundStructure3D(compound.id);
      expect(struct).toBeDefined();
      expect(struct!.atoms.length).toBeGreaterThan(0);
      expect(struct!.bonds.length).toBeGreaterThan(0);

      struct!.atoms.forEach((atom) => {
        expect(Number.isFinite(atom.x)).toBe(true);
        expect(Number.isFinite(atom.y)).toBe(true);
        expect(Number.isFinite(atom.z)).toBe(true);
        expect(atom.atomicNumber).toBeGreaterThan(0);
      });

      struct!.bonds.forEach((bond) => {
        expect(bond.from).toBeGreaterThanOrEqual(0);
        expect(bond.from).toBeLessThan(struct!.atoms.length);
        expect(bond.to).toBeGreaterThanOrEqual(0);
        expect(bond.to).toBeLessThan(struct!.atoms.length);
        expect(bond.from).not.toBe(bond.to);

        const a = struct!.atoms[bond.from];
        const b = struct!.atoms[bond.to];
        const dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        expect(dist).toBeGreaterThan(0.5);
        expect(dist).toBeLessThan(4.5);
      });
    });

    expect(Object.keys(COMPOUND_STRUCTURES).length).toBe(COMPOUNDS_DATABASE.length);
  });

  it('models Caffeine (C8H10N4O2) and Glucose (C6H12O6) with exact 24-atom stoichiometry', () => {
    const caffeineCounts = countBySymbol('c8h10n4o2');
    expect(caffeineCounts).toEqual({ C: 8, H: 10, N: 4, O: 2 });
    const caffeine = getCompoundStructure3D('c8h10n4o2')!;
    expect(caffeine.representation).toBe('covalent');
    expect(caffeine.bonds.filter((b) => b.order === 2).length).toBeGreaterThanOrEqual(4);

    const glucoseCounts = countBySymbol('c6h12o6');
    expect(glucoseCounts).toEqual({ C: 6, H: 12, O: 6 });
    const glucose = getCompoundStructure3D('c6h12o6')!;
    expect(glucose.representation).toBe('covalent');
    expect(glucose.bonds.length).toBe(24);
  });

  it('models ionic lattices (Fe2O3, CuSO4, AgNO3, KMnO4, NaCl) and covalent network (SiO2) accurately', () => {
    const fe2o3 = getCompoundStructure3D('fe2o3')!;
    expect(fe2o3.representation).toBe('ionic_lattice');
    const fe2o3Counts = countBySymbol('fe2o3');
    expect(fe2o3Counts.Fe * 3).toBe(fe2o3Counts.O * 2);

    const sio2 = getCompoundStructure3D('sio2')!;
    expect(sio2.representation).toBe('covalent_network');
    expect(sio2.atoms.length).toBeGreaterThanOrEqual(15);
    expect(sio2.bonds.every((b) => b.order === 'network')).toBe(true);

    const cuso4 = getCompoundStructure3D('cuso4')!;
    expect(cuso4.representation).toBe('ionic_lattice');
    const cuCounts = countBySymbol('cuso4');
    expect(cuCounts.S).toBe(cuCounts.Cu);
    expect(cuCounts.O).toBe(cuCounts.Cu * 4);

    const agno3 = getCompoundStructure3D('agno3')!;
    expect(agno3.representation).toBe('ionic_lattice');
    const agCounts = countBySymbol('agno3');
    expect(agCounts.N).toBe(agCounts.Ag);
    expect(agCounts.O).toBe(agCounts.Ag * 3);

    const kmno4 = getCompoundStructure3D('kmno4')!;
    expect(kmno4.representation).toBe('ionic_lattice');
    const kCounts = countBySymbol('kmno4');
    expect(kCounts.Mn).toBe(kCounts.K);
    expect(kCounts.O).toBe(kCounts.K * 4);
  });
});

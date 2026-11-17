# Economy & Pricing Specification (`ECONOMY.md`)

All element base prices originate strictly from `Daftar_Harga_118_Unsur.json` (`src/data/elements.json`). Centralized runtime defaults reside in `src/data/economy-config.json` and `DEFAULT_ECONOMY_CONFIG`.

## 1. Element Property Formulas
- **Base Property Price**: `max(500, round(massNumberForPricing) * 100)`
- **Minimum Auction Bid (70% rounded up to nearest 100)**: `ceil((basePrice * 0.70) / 100) * 100`
- **Small Company Construction Cost (~2/3 base)**: `max(300, round((basePrice * 2 / 3) / 100) * 100)`
- **Big Company Upgrade Cost**: `1 × smallCompanyCost` (requires 4 small companies; replaces all 4 small companies with 1 Big Company)
- **Own-Tile Maintenance**: `2 × basePrice` paid to bank when owner lands on own element tile
- **Base Rent**: `max(10, round((basePrice * 0.075) / 10) * 10)`
- **Rent Multipliers**: Base `1×`, Complete Set `2×` (`DRAFT`, disabled by default), 1 Small `5×`, 2 Small `15×`, 3 Small `43×`, 4 Small `60×`, Big Company `75×`

## 2. START Business Income (Approved v3.0 Rule)
- **Fixed Flat START Salary**: `0 KK` (`fixedStartSalary: 0` default)
- **Calculation Base**: `smallCompanyCost` of that element property
- **Rates by Development Level**:
  - 0 companies: `0%`
  - 1 small company: `120%` (`1.2 × smallCompanyCost`)
  - 2 small companies: `140%` (`1.4 × smallCompanyCost`)
  - 3 small companies: `160%` (`1.6 × smallCompanyCost`)
  - 4 small companies: `180%` (`1.8 × smallCompanyCost`)
  - 1 big company: `200%` (`2.0 × smallCompanyCost`)

### Canonical Worked Example — Oxygen (O, Z=8, mass 16)
- Base Price: `1,600 KK`
- Small Company Cost: `1,100 KK`
- Auction Min: `1,200 KK` | Own-Tile Maintenance: `3,200 KK`
- Rent Schedule: Base `120`, 1 Small `600`, 2 Small `1,800`, 3 Small `5,160`, 4 Small `7,200`, Big `9,000 KK`
- START Income: 1 Small `1,320 KK`, 2 Small `1,540 KK`, 3 Small `1,760 KK`, 4 Small `1,980 KK`, Big `2,200 KK`

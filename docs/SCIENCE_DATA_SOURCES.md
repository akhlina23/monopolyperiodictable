# Scientific Data Sources & Coverage (`SCIENCE_DATA_SOURCES.md`)

All scientific records are original structured compilations checked against public reference standards—never scraped from third-party source code. Any unverified or unmeasured property is rendered strictly as **`Data belum tersedia`** (or **`Unknown`** for undetermined physical state-of-matter).

## 1. Primary Datasets (`src/data/`)
- **`elements.json` & `elementPropertiesEnriched.ts`**:
  - **Source**: IUPAC / CIAAW Standard Atomic Weights (2021/2023 tables) & NIST Chemistry WebBook physical constants; element pricing strictly derived from `Daftar_Harga_118_Unsur.json`.
  - **Coverage**: 118/118 elements (`Z=1..118`) including English & Indonesian names, standard IUPAC groups (1–18), traditional A/B labels, periods, s/p/d/f blocks, electron shells, melting/boiling points, density, Pauling electronegativity, first ionization energy, covalent/atomic radius, and discovery years where experimentally confirmed.
  - **Conventions**:
    - Temperature boundary rules: `T < meltingPointC => Solid`; `meltingPointC <= T < boilingPointC => Liquid`; `T >= boilingPointC => Gas`. Elements lacking verified melting points report `Unknown`.
    - Superheavy synthetic elements (e.g., `Z >= 100`) without confirmed bulk thermodynamic constants intentionally set numeric properties to `null` -> rendered as `Data belum tersedia`.
- **`isotopes.ts`**:
  - **Source**: IAEA LiveChart of Nuclides / NIST Atomic Weights & Isotopic Compositions.
  - **Coverage**: Curated verified nuclide tables for key elements (e.g. H, He, Li, C, N, O, Na, Cl, Fe, Cu, Br, Ag, I, Au, Hg, Pb, U); uncatalogued elements explicitly report `Data belum tersedia` rather than synthesizing estimates.
- **`compounds.ts`**:
  - **Source**: PubChem / IUPAC Nomenclature public reference sheets.
  - **Coverage**: Curated high-school & industrial compounds (H2O, CO2, NaCl, NH3, H2SO4, CH4, HCl, NaOH, CaCO3, C6H12O6, Fe2O3, C2H5OH, KMnO4, SiO2, O3, C8H10N4O2) with exact molar mass, constituent elements, solubility, and verified constants.

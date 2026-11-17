export interface BilingualText {
  id: string;
  en: string;
}

export interface ElementDossierEntry {
  history: BilingualText;
  applications: BilingualText;
  funFact: BilingualText;
}

export const ELEMENT_DOSSIER_PART_1: Record<number, ElementDossierEntry> = {
  1: {
    history: {
      id: 'Dikenali sebagai gas tersendiri oleh Henry Cavendish pada 1766 di London ketika mereaksikan logam dengan asam, lalu dinamai "hidrogen" (pembentuk air) oleh Antoine Lavoisier pada 1783.',
      en: 'Identified as a distinct gas by Henry Cavendish in 1766 in London when reacting metals with acids, and later named "hydrogen" (water-former) by Antoine Lavoisier in 1783.',
    },
    applications: {
      id: 'Bahan baku utama sintesis amonia (pupuk), pemurnian minyak bumi, sel bahan bakar (fuel cell) bersih, serta bahan bakar roket cair.',
      en: 'Primary feedstock for ammonia fertilizer synthesis, petroleum refining, clean hydrogen fuel cells, and liquid rocket propulsion.',
    },
    funFact: {
      id: 'Sekitar 75% massa materi biasa di alam semesta adalah hidrogen, dan di dalam inti planet Jupiter tekanannya begitu ekstrem hingga hidrogen berubah menjadi logam cair penghantar listrik.',
      en: 'About 75% of normal baryonic mass in the universe is hydrogen, and deep inside Jupiter extreme pressure compresses it into an electrically conducting liquid metal.',
    },
  },
  2: {
    history: {
      id: 'Unik karena ditemukan di Matahari sebelum di Bumi: Pierre Janssen dan Norman Lockyer mendeteksi garis spektrum kuning tak dikenal saat gerhana matahari total 1868, sebelum William Ramsay mengisolasinya dari mineral kleveit pada 1895.',
      en: 'Uniquely discovered in the Sun before Earth: Pierre Janssen and Norman Lockyer detected an unknown yellow spectral line during the 1868 solar eclipse before William Ramsay isolated it from cleveite ore in 1895.',
    },
    applications: {
      id: 'Pendingin kriogenik magnet superkonduktor mesin MRI dan akselerator partikel (LHC), atmosfer pelindung pengelasan, serta gas pengangkat balon penelitian.',
      en: 'Cryogenic coolant for superconducting magnets in MRI scanners and particle accelerators, shielding gas in arc welding, and high-altitude research balloons.',
    },
    funFact: {
      id: 'Helium adalah satu-satunya unsur yang tidak pernah membeku pada tekanan atmosfer normal meskipun didinginkan mendekati nol mutlak (0 K), dan pada 2,17 K ia berubah menjadi superfluida yang dapat memanjat dinding wadahnya.',
      en: 'Helium is the only element that cannot solidify at standard atmospheric pressure even near absolute zero, turning into a zero-viscosity superfluid at 2.17 K that climbs container walls.',
    },
  },
  3: {
    history: {
      id: 'Ditemukan oleh Johan August Arfwedson pada 1817 di Stockholm saat menganalisis mineral petalit; logam murninya baru berhasil diisolasi melalui elektrolisis oleh William Thomas Brande dan Humphry Davy pada 1821.',
      en: 'Discovered by Johan August Arfwedson in 1817 in Stockholm while analyzing petalite ore; pure metallic lithium was first isolated by electrolysis by William Thomas Brande and Humphry Davy in 1821.',
    },
    applications: {
      id: 'Katoda dan elektrolit baterai ion-litium untuk kendaraan listrik dan gawai, keramik tahan panas, pelumas industri berkinerja tinggi, serta terapi medis gangguan bipolar.',
      en: 'Core material in rechargeable lithium-ion batteries for EVs and electronics, heat-resistant glass-ceramics, industrial greases, and psychiatric mood stabilizers.',
    },
    funFact: {
      id: 'Litium adalah logam paling ringan sekaligus unsur padat paling ringan di alam semesta dengan massa jenis sekitar setengah massa jenis air—ia cukup ringan untuk mengapung di atas minyak tanah.',
      en: 'Lithium is the least dense metal and least dense solid element at roughly half the density of water—light enough to float even on kerosene.',
    },
  },
  4: {
    history: {
      id: 'Ditemukan pada 1798 oleh ahli kimia Prancis Louis-Nicolas Vauquelin sebagai oksida di dalam mineral beril dan zamrud, lalu diisolasi secara independen sebagai logam oleh Friedrich Wöhler dan Antoine Bussy pada 1828.',
      en: 'Discovered in 1798 by French chemist Louis-Nicolas Vauquelin as an oxide inside beryl and emerald crystals, and independently isolated as a metal by Friedrich Wöhler and Antoine Bussy in 1828.',
    },
    applications: {
      id: 'Jendela sinar-X bertransparansi tinggi, cermin teleskop luar angkasa James Webb, komponen kedirgantaraan ultra-kaku, serta paduan tembaga-berilium anti-percikan.',
      en: 'X-ray tube windows, mirrors for the James Webb Space Telescope, ultra-stiff aerospace structures, and non-sparking copper-beryllium safety tools.',
    },
    funFact: {
      id: 'Garam berilium awalnya dinamai "glucinium" karena rasanya manis di lidah, meski sebenarnya sangat beracun bagi paru-paru dan jaringan tubuh.',
      en: 'Beryllium salts were originally named "glucinium" because they taste distinctly sweet, despite being severely toxic if inhaled or ingested.',
    },
  },
  5: {
    history: {
      id: 'Diisolasi pada 1808 hampir bersamaan oleh Joseph Louis Gay-Lussac bersama Louis Jacques Thénard di Paris dan Sir Humphry Davy di London dengan mereduksi asam borat menggunakan kalium.',
      en: 'Isolated in 1808 almost simultaneously by Joseph Louis Gay-Lussac and Louis Jacques Thénard in Paris and Sir Humphry Davy in London by reducing boric acid with potassium.',
    },
    applications: {
      id: 'Kaca borosilikat (Pyrex) tahan kejut termal, serat kaca isolasi, batang kendali penyerap neutron di reaktor nuklir, dan magnet neodimium-besi-boron.',
      en: 'Thermal-shock-resistant borosilicate laboratory glassware, fiberglass insulation, neutron-absorbing nuclear control rods, and powerful NdFeB permanent magnets.',
    },
    funFact: {
      id: 'Boron murni hampir tidak terbentuk di bintang secara biasa; sebagian besar boron di Bumi dihasilkan oleh hantaman sinar kosmik yang memecah atom karbon dan oksigen di ruang antarbintang.',
      en: 'Pure boron is barely forged in ordinary stellar fusion; most boron on Earth originated from high-energy cosmic rays shattering carbon and oxygen nuclei in interstellar space.',
    },
  },
  6: {
    history: {
      id: 'Dikenal sejak zaman prasejarah sebagai arang dan jelaga; pengakuan karbon sebagai unsur kimia resmi dirumuskan oleh Antoine Lavoisier dalam daftar unsurnya pada 1789 setelah membuktikan intan adalah karbon murni.',
      en: 'Known since prehistory as charcoal and soot; formally classified as a chemical element by Antoine Lavoisier in 1789 after demonstrating that diamond burns into pure carbon dioxide.',
    },
    applications: {
      id: 'Kerangka dasar seluruh molekul organik kehidupan, baja dan serat karbon komposit, elektroda baterai, intan pemotong industri, serta penanggalan radiokarbon C-14.',
      en: 'Backbone of all organic biomolecules, steel alloys and lightweight carbon-fiber composites, battery anodes, industrial diamonds, and radiocarbon-14 dating.',
    },
    funFact: {
      id: 'Karbon dapat menyusun dirinya menjadi grafit yang sangat lunak sekaligus intan—material alami paling keras—serta lembaran grafena setebal satu atom yang 200 kali lebih kuat daripada baja.',
      en: 'Carbon arranges into both ultra-soft pencil graphite and natural diamond—the hardest mineral—plus single-atom-thick graphene sheets roughly 200 times stronger than steel.',
    },
  },
  7: {
    history: {
      id: 'Diisolasi pada 1772 oleh dokter Skotlandia Daniel Rutherford di Edinburgh yang menyebutnya "udara beracun" (noxious air) setelah menyerap oksigen dan karbon dioksida dari udara tertutup.',
      en: 'Isolated in 1772 by Scottish physician Daniel Rutherford in Edinburgh, who called it "noxious air" after removing oxygen and carbon dioxide from a sealed bell jar.',
    },
    applications: {
      id: 'Produksi amonia dan pupuk lewat proses Haber-Bosch, atmosfer inert pengemasan makanan, pendinginan kriogenik nitrogen cair (-196°C), dan sintesis farmasi.',
      en: 'Haber-Bosch ammonia and fertilizer production, inert food packaging atmospheres, cryogenic freezing with liquid nitrogen (-196 °C), and pharmaceutical synthesis.',
    },
    funFact: {
      id: 'Ikatan rangkap tiga pada molekul N₂ adalah salah satu ikatan kimia terkuat di alam, membuat gas nitrogen hampir tak bereaksi di udara meski menyusun 78% atmosfer Bumi.',
      en: 'The triple covalent bond in N₂ is one of the strongest chemical bonds in nature, making atmospheric nitrogen nearly inert despite comprising 78% of Earth’s air.',
    },
  },
  8: {
    history: {
      id: 'Ditemukan oleh Carl Wilhelm Scheele di Swedia sekitar 1771 dan dipublikasikan lebih dulu oleh Joseph Priestley pada 1774 dengan memanaskan raksa(II) oksida memakai lensa surya; dinamai "oksigen" oleh Lavoisier.',
      en: 'Discovered by Carl Wilhelm Scheele in Sweden around 1771 and published first by Joseph Priestley in 1774 by focusing sunlight onto mercuric oxide; named "oxygen" by Lavoisier.',
    },
    applications: {
      id: 'Terapi pernapasan medis, peleburan baja efisiensi tinggi, oksidator propelan roket cair, pengolahan air limbah, dan sintesis ozon desinfektan.',
      en: 'Medical oxygen therapy, basic-oxygen steelmaking, liquid-rocket oxidizer, wastewater aeration, and ozone water sterilization.',
    },
    funFact: {
      id: 'Meski dalam bentuk gas ia tak berwarna, oksigen cair dan padat berwarna biru langit pucat serta bersifat paramagnetik—artinya oksigen cair akan menempel di antara kutub magnet kuat.',
      en: 'Although colorless as a gas, both liquid and solid oxygen are pale sky blue and strongly paramagnetic—meaning liquid oxygen hangs suspended between the poles of a magnet.',
    },
  },
  9: {
    history: {
      id: 'Keberadaannya dalam fluorit diketahui sejak abad ke-16, tetapi sifatnya yang sangat korosif menewaskan atau melukai banyak perintis kimia hingga Henri Moissan berhasil mengisolasinya lewat elektrolisis suhu rendah pada 1886.',
      en: 'Known in fluorite minerals since the 1500s, its extreme reactivity injured early chemists until Henri Moissan finally isolated pure F₂ gas by low-temperature electrolysis in 1886.',
    },
    applications: {
      id: 'Pembuatan polimer PTFE (Teflon), pasta gigi berfluorida pencegah karies, gas SF₆ isolator gardu tegangan tinggi, dan pengayaan uranium (UF₆).',
      en: 'Manufacturing PTFE (Teflon) fluoropolymers, cavity-preventing dental fluorides, high-voltage SF₆ electrical switchgear insulation, and uranium enrichment.',
    },
    funFact: {
      id: 'Fluorin adalah unsur dengan keelektronegatifan tertinggi di seluruh tabel periodik (3,98) dan sanggup mengoksidasi gas mulia berat seperti xenon hingga membentuk senyawa padat.',
      en: 'Fluorine holds the highest electronegativity on the periodic table (3.98) and is reactive enough to strip electrons from "inert" noble gases like xenon.',
    },
  },
  10: {
    history: {
      id: 'Ditemukan pada 1898 oleh Sir William Ramsay dan Morris Travers di London melalui distilasi fraksional udara cair; saat dialiri arus listrik di tabung vakum, gas itu langsung berpendar merah-jingga menyala.',
      en: 'Discovered in 1898 by Sir William Ramsay and Morris Travers in London by fractional distillation of liquid air; electrified in a vacuum tube, it blazed bright crimson-orange.',
    },
    applications: {
      id: 'Papan lampu neon iklan bertegangan tinggi, indikator tegangan, laser helium-neon (HeNe), dan pendingin kriogenik khusus di rentang 27 K.',
      en: 'High-voltage luminous neon signage, voltage surge arrestors, helium-neon gas lasers, and specialty cryogenic refrigeration around 27 K.',
    },
    funFact: {
      id: 'Hingga kini tidak ada satu pun senyawa kimia netral stabil yang berhasil dibuat dari neon—ia benar-benar unsur paling "cuek" secara kimia di seluruh alam semesta.',
      en: 'No confirmed neutral, stable chemical compound of neon has ever been synthesized—making neon even less chemically reactive than helium in practice.',
    },
  },
  11: {
    history: {
      id: 'Diisolasi pertama kali oleh Sir Humphry Davy pada 1807 di Royal Institution London dengan mengelektrolisis soda kaustik (NaOH) leleh memakai baterai tumpukan volta raksasa.',
      en: 'First isolated by Sir Humphry Davy in 1807 at London’s Royal Institution by electrolyzing molten caustic soda (NaOH) with a massive voltaic pile battery.',
    },
    applications: {
      id: 'Garam dapur (NaCl) dan soda abu pembuat kaca, pendingin logam cair pada reaktor nuklir pembiak cepat, lampu jalan uap natrium, serta penghantar impuls saraf biologis.',
      en: 'Table salt (NaCl), soda ash for glassmaking, liquid-metal coolant in fast nuclear reactors, yellow street lamps, and essential biological nerve-signal ions.',
    },
    funFact: {
      id: 'Natrium murni sangat lunak hingga bisa dipotong dengan pisau mentega dan langsung mendesis, meleleh menjadi bola perak, lalu meledak jika menyentuh air.',
      en: 'Pure sodium metal is soft enough to slice with a butter knife and skitters violently across water, melting into a silver sphere that often ignites on contact.',
    },
  },
  12: {
    history: {
      id: 'Diakui sebagai unsur tersendiri oleh Joseph Black pada 1755 dari garam magnesia, dan diisolasi sebagai logam oleh Humphry Davy pada 1808 lewat elektrolisis campuran magnesia dan oksida raksa.',
      en: 'Recognized as a distinct element by Joseph Black in 1755 from magnesia alba, and isolated as metal by Humphry Davy in 1808 via electrolysis.',
    },
    applications: {
      id: 'Paduan struktural ultra-ringan pesawat dan bodi laptop, kembang api putih cemerlang, suplemen nutrisi, serta pusat molekul klorofil tumbuhan hijau.',
      en: 'Ultra-lightweight aerospace and electronics alloys, brilliant white pyrotechnic flares, dietary supplements, and the central coordinating ion inside chlorophyll.',
    },
    funFact: {
      id: 'Api magnesium terbakar pada suhu lebih dari 3.100°C dan tidak bisa dipadamkan dengan air atau karbon dioksida—justru magnesium akan merampas oksigen dari CO₂ dan terus menyala.',
      en: 'Burning magnesium reaches over 3,100 °C and cannot be extinguished with water or CO₂—it actually strips oxygen out of carbon dioxide to keep burning.',
    },
  },
  13: {
    history: {
      id: 'Pertama kali dihasilkan dalam bentuk tak murni oleh Hans Christian Ørsted pada 1825, kemudian dimurnikan oleh Friedrich Wöhler pada 1827 dan diproduksi massal murah lewat proses Hall-Héroult pada 1886.',
      en: 'First produced in impure form by Hans Christian Ørsted in 1825, refined by Friedrich Wöhler in 1827, and made affordable by the Hall-Héroult electrolytic process in 1886.',
    },
    applications: {
      id: 'Rangka pesawat terbang, kabel transmisi listrik ringan, kaleng minuman yang mudah didaur ulang, foil kemasan, dan cermin optik teleskop.',
      en: 'Aircraft airframes, lightweight power transmission lines, infinitely recyclable beverage cans, packaging foil, and telescope mirror coatings.',
    },
    funFact: {
      id: 'Sebelum elektrolisis ditemukan pada 1880-an, aluminium lebih mahal daripada emas—Kaisar Napoleon III konon menyajikan alat makan aluminium hanya untuk tamu paling terhormat sementara tamu lain memakai emas.',
      en: 'Before electrolytic smelting in the 1880s, aluminium cost more than gold—Emperor Napoleon III famously served his most honored guests on aluminium plates while lesser guests used gold.',
    },
  },
  14: {
    history: {
      id: 'Diidentifikasi oleh Antoine Lavoisier pada 1787 dalam kuarsa, lalu diisolasi secara murni oleh Jöns Jacob Berzelius pada 1824 dengan memanaskan kalium fluorosilikat bersama logam kalium.',
      en: 'Suspected as an element by Antoine Lavoisier in 1787 and first isolated in pure form by Jöns Jacob Berzelius in 1824 by heating potassium fluorosilicate with potassium.',
    },
    applications: {
      id: 'Wafer semikonduktor ultra-murni untuk mikroprosesor dan sel surya, silika pembuat kaca dan beton, serta polimer silikon medis dan industri.',
      en: 'Ultra-pure semiconductor wafers for computer chips and solar cells, silica for glass and concrete, and flexible silicone polymers.',
    },
    funFact: {
      id: 'Kerak Bumi mengandung sekitar 28% silikon berdasarkan massa—hampir setiap butir pasir pantai dan batu kuarsa tersusun atas jaringan atom silikon dan oksigen.',
      en: 'Earth’s crust is roughly 28% silicon by mass—nearly every grain of beach sand and quartz crystal is a three-dimensional network of silicon and oxygen.',
    },
  },
  15: {
    history: {
      id: 'Menjadi unsur pertama yang penemunya tercatat dalam sejarah modern: Hennig Brand pada 1669 di Hamburg menyuling ribuan liter urine fermentasi demi mencari "batu bertuah" pembuat emas.',
      en: 'The first element in modern history with a recorded discoverer: in 1669 German alchemist Hennig Brand distilled fermented urine in Hamburg seeking the philosopher’s stone.',
    },
    applications: {
      id: 'Pupuk fosfat pertanian global, kepala korek api gesek (fosfor merah), detergen, baja tahan aus, serta tulang punggung DNA, RNA, dan molekul energi ATP.',
      en: 'Global phosphate fertilizers, safety matchboxes (red phosphorus), steel metallurgy, and the structural backbone of DNA, RNA, and cellular ATP energy.',
    },
    funFact: {
      id: 'Tubuh manusia dewasa menyimpan sekitar 700–800 gram fosfor—cukup banyak di tulang dan gigi sehingga Brand menamainya "pembawa cahaya" (phosphorus) karena pendaran redupnya dalam gelap.',
      en: 'An adult human body holds around 750 grams of phosphorus—mostly in bones and teeth—named "light-bearer" because white phosphorus glows softly when exposed to air.',
    },
  },
  16: {
    history: {
      id: 'Dikenal sejak zaman kuno dengan sebutan belerang atau "brimstone" di sekitar kawah gunung api; ditetapkan sebagai unsur kimia murni oleh Antoine Lavoisier pada 1777.',
      en: 'Known since antiquity as volcanic "brimstone"; formally proven to be a chemical element rather than a compound by Antoine Lavoisier in 1777.',
    },
    applications: {
      id: 'Produksi asam sulfat (bahan kimia industri nomor satu di dunia), vulkanisasi karet ban, bubuk mesiu, fungisida kebun anggur, dan baterai litium-sulfur.',
      en: 'Sulfuric acid production (the world’s largest industrial chemical), rubber vulcanization for tires, black powder, vineyard fungicides, and essential protein amino acids.',
    },
    funFact: {
      id: 'Bulan Io milik planet Jupiter penuh dengan danau dan gunung berapi belerang cair warna-warni yang meletuskan gumpalan sulfur setinggi ratusan kilometer ke angkasa.',
      en: 'Jupiter’s moon Io is carpeted in molten sulfur lakes and volcanoes that hurl yellow-orange sulfur plumes hundreds of kilometers into space.',
    },
  },
  17: {
    history: {
      id: 'Pertama kali diisolasi pada 1774 oleh Carl Wilhelm Scheele di Swedia ketika mereaksikan asam klorida dengan batu kawi (MnO₂), lalu dipastikan sebagai unsur sejati oleh Humphry Davy pada 1810.',
      en: 'First isolated in 1774 by Carl Wilhelm Scheele in Sweden by reacting hydrochloric acid with pyrolusite (MnO₂), and proven to be an element by Humphry Davy in 1810.',
    },
    applications: {
      id: 'Disinfeksi air minum dan kolam renang, pembuatan plastik PVC pipa bangunan, pemutih kertas dan tekstil, serta sintesis sebagian besar obat farmasi.',
      en: 'Municipal drinking-water disinfection, PVC construction piping, paper bleaching, and intermediate reagent in over 80% of modern pharmaceuticals.',
    },
    funFact: {
      id: 'Gas klorin, yang juga dikenal sebagai bertholite (dinamai untuk menghormati Claude Louis Berthollet yang meneliti sifat pemutihnya), pertama kali dipelajari pada 1774 dan sempat disangka mengandung oksigen selama lebih dari 30 tahun.',
      en: 'Chlorine gas—historically also called "bertholite" after French chemist Claude Louis Berthollet who pioneered its bleaching use—was first isolated in 1774 and mistakenly thought to contain oxygen for over 30 years.',
    },
  },
  18: {
    history: {
      id: 'Ditemukan oleh Lord Rayleigh dan Sir William Ramsay pada 1894 setelah memperhatikan bahwa nitrogen yang diekstrak dari udara selalu lebih berat daripada nitrogen murni dari senyawa kimia.',
      en: 'Discovered by Lord Rayleigh and Sir William Ramsay in 1894 after noticing that nitrogen extracted from air was consistently denser than chemically generated nitrogen.',
    },
    applications: {
      id: 'Gas pelindung pengelasan TIG/MIG logam reaktif, pengisi celah kaca jendela ganda isolasi termal, bola lampu pijar, dan lingkungan kerja bebas oksigen bagi arsip kuno.',
      en: 'Inert shielding gas for TIG/MIG welding, thermal insulation inside double-glazed windows, incandescent bulb fill gas, and oxygen-free preservation chambers.',
    },
    funFact: {
      id: 'Argon berasal dari kata Yunani "argos" yang berarti "malas" karena keengganannya bereaksi—padahal gas mulia ini adalah gas ketiga terbanyak di atmosfer Bumi (0,93%), melampaui karbon dioksida.',
      en: 'Named from the Greek "argos" meaning "lazy" for its inertness, argon is actually the third most abundant gas in Earth’s atmosphere (0.93%), beating carbon dioxide by over 20 times.',
    },
  },
  19: {
    history: {
      id: 'Menjadi logam pertama yang berhasil diisolasi melalui elektrolisis oleh Sir Humphry Davy pada Oktober 1807 menggunakan kalium hidroksida (potash) lembap.',
      en: 'Became the very first metal isolated by electrolysis when Sir Humphry Davy extracted gleaming globules from moist potash (KOH) in October 1807.',
    },
    applications: {
      id: 'Pupuk kalium pertanian (NPK), kaca pengaman tahan pecah, sabun cair, serta elektrolit vital sel saraf dan kontraksi otot jantung.',
      en: 'Essential agricultural potash fertilizers, chemically strengthened smartphone glass, liquid soaps, and vital cellular electrolytes regulating heartbeat and nerve impulses.',
    },
    funFact: {
      id: 'Kalium alami mengandung isotop radioaktif Kalium-40 dalam jumlah renik, sehingga pisang matang dan tubuh manusia sendiri memancarkan sedikit radioaktivitas alami setiap detiknya.',
      en: 'Natural potassium contains tiny traces of radioactive Potassium-40, making everyday foods like bananas—and the human body itself—gently radioactive.',
    },
  },
  20: {
    history: {
      id: 'Senyawa kapurnya (calx) dipakai bangsa Romawi untuk membuat semen sejak ribuan tahun lalu; logam kalsium murni baru diisolasi oleh Humphry Davy pada 1808 lewat elektrolisis kapur dan raksa oksida.',
      en: 'Calcium lime mortar was used by ancient Romans for millennia, while pure calcium metal was isolated by Humphry Davy in 1808 via electrolysis.',
    },
    applications: {
      id: 'Bahan utama semen dan beton konstruksi, agen pereduksi dalam pemurnian logam, suplemen pembentuk tulang dan gigi, serta pengatur kontraksi sel otot.',
      en: 'Cornerstone of Portland cement and concrete, metallurgical reducing agent, dietary mineral for bone and teeth mineralization, and intracellular signaling.',
    },
    funFact: {
      id: 'Cangkang telur, kerang laut, batu gamping, marmer, dan mutiara semuanya dibangun dari senyawa kimia yang sama persis: kalsium karbonat (CaCO₃) dalam susunan kristal berbeda.',
      en: 'Eggshells, seashells, limestone cliffs, marble statues, and natural pearls are all built from the exact same compound—calcium carbonate (CaCO₃)—arranged in distinct crystal habits.',
    },
  },
  21: {
    history: {
      id: 'Keberadaannya diprediksi akurat oleh Dmitri Mendeleev pada 1869 sebagai "ekaboron", lalu benar-benar ditemukan oleh Lars Fredrik Nilson pada 1879 di Swedia dari mineral euxenite dan gadolinite.',
      en: 'Accurately predicted by Dmitri Mendeleev in 1869 as "eka-boron" and discovered in 1879 by Lars Fredrik Nilson in Sweden while analyzing rare Scandinavian minerals.',
    },
    applications: {
      id: 'Paduan aluminium-skandium berkekuatan tinggi untuk pesawat tempur dan rangka sepeda balap kelas elite, serta lampu stadion halida logam berintensitas mirip sinar matahari.',
      en: 'High-strength aluminium-scandium alloys for fighter jets and elite racing bicycle frames, plus daylight-spectrum stadium metal-halide lamps.',
    },
    funFact: {
      id: 'Skandium sebenarnya lebih melimpah di kerak Bumi daripada timbal, namun sangat tersebar merata sehingga hampir tidak pernah membentuk tambang murni yang ekonomis.',
      en: 'Scandium is actually more common in Earth’s crust than lead, yet it is so thinly dispersed across rocks that concentrated mineable deposits are exceedingly rare.',
    },
  },
  22: {
    history: {
      id: 'Ditemukan pada 1791 oleh pendeta dan ahli geologi amatir William Gregor di pasir hitam Cornwall, lalu dinamai "titanium" berdasarkan para Titan mitologi Yunani oleh Martin Heinrich Klaproth pada 1795.',
      en: 'Discovered in 1791 by English clergyman and amateur mineralogist William Gregor in black Cornish sand, and named after the Greek Titans by Martin Heinrich Klaproth in 1795.',
    },
    applications: {
      id: 'Rangka pesawat jet dan mesin turbin, implan tulang dan sendi biokompatibel, serta pigmen putih super-cerah titanium dioksida (TiO₂) pada cat dan tabir surya.',
      en: 'Supersonic aircraft frames and jet engine blades, biocompatible medical bone implants, and brilliant white TiO₂ pigment for paints and mineral sunscreens.',
    },
    funFact: {
      id: 'Titanium sekuat banyak jenis baja namun 45% lebih ringan, dan merupakan salah satu dari sedikit logam yang dapat menyatu langsung dengan jaringan tulang manusia (oseointegrasi) tanpa memicu penolakan imun.',
      en: 'Titanium matches the strength of many steels at 45% lower weight and is one of the few metals to osseointegrate directly with living human bone without immune rejection.',
    },
  },
  23: {
    history: {
      id: 'Ditemukan oleh Andrés Manuel del Río pada 1801 di Meksiko dengan nama "eritronium", sempat diragukan oleh ahli kimia Eropa, lalu ditemukan kembali oleh Nils Gabriel Sefström pada 1830 dan dinamai menurut dewi Skandinavia Vanadis.',
      en: 'Discovered in 1801 in Mexico by Andrés Manuel del Río, mistakenly dismissed in Europe, and independently rediscovered by Nils Gabriel Sefström in 1830 who named it after Norse goddess Vanadis.',
    },
    applications: {
      id: 'Baja paduan vanadium super-tangguh untuk perkakas, pegas otomotif, dan rel kereta, katalis industri asam sulfat, serta baterai aliran redoks vanadium skala jaringan listrik.',
      en: 'High-toughness vanadium tool steels, automotive springs, industrial sulfuric acid catalysts, and grid-scale vanadium redox flow batteries.',
    },
    funFact: {
      id: 'Dalam larutan air, ion vanadium berubah warna mencolok sesuai tingkat oksidasinya: +5 kuning cerah, +4 biru laut, +3 hijau zamrud, dan +2 ungu lilac.',
      en: 'In aqueous solution, vanadium ions paint a chemical rainbow across oxidation states: +5 bright yellow, +4 ocean blue, +3 emerald green, and +2 lilac violet.',
    },
  },
  24: {
    history: {
      id: 'Ditemukan pada 1797 oleh Louis-Nicolas Vauquelin dari mineral timbal merah Siberia (krokoit) dan dinamai dari kata Yunani "chroma" (warna) karena senyawanya yang beraneka warna.',
      en: 'Discovered in 1797 by Louis-Nicolas Vauquelin from bright red Siberian crocoite ore and named from the Greek "chroma" (color) for its vivid pigments.',
    },
    applications: {
      id: 'Unsur penentu baja nirkarat (stainless steel) anti-karat, pelapisan krom mengilap, pigmen hijau dan kuning industri, serta penyamakan kulit.',
      en: 'Essential corrosion-proofing ingredient in stainless steel, mirror-bright decorative chrome plating, vibrant mineral pigments, and superalloys.',
    },
    funFact: {
      id: 'Warna merah menyala pada batu permata rubi sekaligus warna hijau pekat pada zamrud berasal dari pengotor kecil atom kromium yang sama yang menggantikan sebagian aluminium di dalam kristal induknya.',
      en: 'Both the deep fiery red of ruby and the lush green of emerald come from trace amounts of the exact same chromium ion sitting in slightly different host crystal lattices.',
    },
  },
  25: {
    history: {
      id: 'Diakui sebagai unsur tersendiri oleh Carl Wilhelm Scheele dan berhasil diisolasi sebagai logam oleh kolega Swedianya Johan Gottlieb Gahn pada 1774 dengan mereduksi pirolusit memakai arang panas.',
      en: 'Recognized as a distinct element by Carl Wilhelm Scheele and first isolated as pure metal by his Swedish colleague Johan Gottlieb Gahn in 1774 using hot charcoal.',
    },
    applications: {
      id: 'Penghilang belerang dan pengeras vital di hampir 90% produksi baja global, kaleng aluminium, katoda baterai EV modern, dan pengaktif enzim fotosintesis pemecah air.',
      en: 'Indispensable desulfurizer and hardener in roughly 90% of global steel, beverage can alloys, EV battery cathodes, and the water-splitting enzyme of plant photosynthesis.',
    },
    funFact: {
      id: 'Dasar samudra dalam di Bumi dipenuhi jutaan "nodul mangan" seukuran kentang yang tumbuh sangat lambat—hanya beberapa milimeter setiap satu juta tahun.',
      en: 'Earth’s deep abyssal ocean floors are littered with potato-sized "manganese nodules" that accrete at a glacial pace of only a few millimeters per million years.',
    },
  },
  26: {
    history: {
      id: 'Dimanfaatkan manusia lebih dari 5.000 tahun lalu awalnya dari meteorit besi jatuh dari langit, sebelum teknik tanur tinggi Zaman Besi berhasil melebur bijih besi bumi sekitar 1200 SM.',
      en: 'Worked by ancient civilizations over 5,000 years ago first from fallen iron meteorites, before Iron Age smelting unlocked terrestrial iron ores around 1200 BCE.',
    },
    applications: {
      id: 'Tulang punggung peradaban industri dalam bentuk besi cor dan baja konstruksi, inti elektromagnet, katalis amonia, serta pengangkut oksigen hemoglobin dalam darah merah.',
      en: 'Backbone of industrial civilization as steel and cast iron, transformer magnetic cores, ammonia synthesis catalysts, and oxygen-binding hemoglobin in red blood cells.',
    },
    funFact: {
      id: 'Besi-56 memiliki inti paling stabil per nukleon; saat bintang raksasa menumpuk inti besi di pusatnya, fusi berhenti menghasilkan energi dan bintang itu meledak sebagai supernova dalam hitungan detik.',
      en: 'Iron sits near the peak of nuclear stability; once a massive star builds an iron core, nuclear fusion halts and the star collapses into a supernova in fractions of a second.',
    },
  },
  27: {
    history: {
      id: 'Senyawa birunya dipakai mewarnai keramik Mesir Kuno dan porselen Tiongkok berabad-abad sebelum Georg Brandt mengisolasi logamnya pada 1735—menjadikan kobalt logam pertama yang ditemukan sejak zaman kuno.',
      en: 'Used in brilliant blue glazes since ancient Egypt before Georg Brandt isolated the metal around 1735—the first metal formally discovered since antiquity.',
    },
    applications: {
      id: 'Katoda baterai litium-ion densitas tinggi, superalloy bilah turbin jet tahan suhu ekstrem, pigmen biru kobalt, serta vitamin B12 esensial bagi tubuh.',
      en: 'High-density lithium-ion battery cathodes, heat-resistant jet-turbine superalloys, classic cobalt-blue ceramic pigments, and the core of Vitamin B12.',
    },
    funFact: {
      id: 'Namanya berasal dari kata Jerman "Kobold" (roh jahat penunggu tambang) karena penambang abad pertengahan mengira bijihnya disihir akibat uap arsenik beracun yang keluar saat dilebur.',
      en: 'Named after German "Kobold" (goblin sprites) by medieval miners who blamed mischievous mine spirits for the toxic arsenic fumes released when smelting cobalt ores.',
    },
  },
  28: {
    history: {
      id: 'Diisolasi pada 1751 oleh ahli mineralogi Swedia Axel Fredrik Cronstedt dari mineral kupfernickel ("tembaga setan") yang awalnya mengecewakan penambang karena tidak menghasilkan tembaga.',
      en: 'Isolated in 1751 by Swedish chemist Axel Fredrik Cronstedt from kupfernickel ("devil’s copper") ore that frustrated miners expecting red copper.',
    },
    applications: {
      id: 'Baja tahan karat, superalloy tahan korosi turbin dan kimia, katoda baterai nikel tinggi, koin logam, serta pelapisan anti-karat.',
      en: 'Austenitic stainless steel, corrosion-proof chemical superalloys, high-nickel EV battery cathodes, durable coinage, and protective electroplating.',
    },
    funFact: {
      id: 'Inti dalam Bumi yang padat diperkirakan terdiri atas paduan sekitar 80% besi dan 5–10% nikel pada suhu setara permukaan Matahari, membantu menjaga medan magnet pelindung planet kita.',
      en: 'Earth’s solid inner core is a colossal iron-nickel alloy sphere at solar-surface temperatures, helping drive the geodynamo that shields our atmosphere.',
    },
  },
  29: {
    history: {
      id: 'Salah satu logam paling awal yang dikenal peradaban manusia (lebih dari 10.000 tahun lalu) karena sering ditemukan sebagai logam alami murni dan mudah ditempa, memicu lahirnya Zaman Perunggu.',
      en: 'One of humanity’s earliest metals—worked over 10,000 years ago as native copper nuggets before alloying with tin launched the Bronze Age.',
    },
    applications: {
      id: 'Kabel listrik dan lilitan motor listrik karena konduktivitas tinggi, pipa air anti-bakteri, penukar panas, serta paduan perunggu dan kuningan.',
      en: 'Electrical wiring, motor windings, antimicrobial plumbing pipes, heat exchangers, and architectural bronze and brass alloys.',
    },
    funFact: {
      id: 'Tembaga dan emas adalah dua logam di seluruh tabel periodik yang tidak berwarna abu-abu perak alami—susunan pita elektron relativistiknya menyerap cahaya biru dan memantulkan kilau jingga-merah hangat.',
      en: 'Copper and gold are the only two elemental metals with rich warm color instead of silver-gray luster, due to d-band electronic transitions absorbing blue light.',
    },
  },
  30: {
    history: {
      id: 'Digunakan dalam kuningan ribuan tahun lalu dan dilebur sebagai logam murni di Rajasthan, India sekitar abad ke-12 sebelum Andreas Sigismund Marggraf mendokumentasikan pemurniannya di Eropa pada 1746.',
      en: 'Smelted into pure metal in Zawar, India by the 12th century and documented independently in Europe by Andreas Sigismund Marggraf in 1746.',
    },
    applications: {
      id: 'Galvanisasi anti-karat rangka baja dan atap, paduan kuningan, anoda baterai kering, krim penyembuh kulit seng oksida, serta ratusan enzim imun tubuh.',
      en: 'Sacrificial galvanization protecting steel infrastructure, brass alloys, alkaline battery anodes, zinc-oxide skin protectants, and over 300 human enzymes.',
    },
    funFact: {
      id: 'Uang koin satu sen Amerika Serikat modern bukan terbuat dari tembaga padat—sekitar 97,5% isinya adalah seng murah yang hanya dilapisi tembaga tipis di bagian luar.',
      en: 'Modern US one-cent pennies are not solid copper—97.5% of each coin’s core is zinc beneath an ultra-thin copper electroplated skin.',
    },
  },
  31: {
    history: {
      id: 'Diramalkan sifatnya secara tepat oleh Mendeleev sebagai "eka-aluminium" pada 1871, lalu ditemukan oleh Paul-Émile Lecoq de Boisbaudran di Paris pada 1875 lewat pengamatan spektroskopi garis ungu ganda.',
      en: 'Predicted with uncanny accuracy by Dmitri Mendeleev as "eka-aluminium" in 1871 and discovered spectroscopically by Paul-Émile Lecoq de Boisbaudran in Paris in 1875.',
    },
    applications: {
      id: 'Semikonduktor kecepatan tinggi galium arsenida (GaAs) dan galium nitrida (GaN) untuk pemancar 5G, lampu LED biru-putih hemat energi, dan termometer non-toksik.',
      en: 'High-frequency GaAs and GaN semiconductors for 5G radios, fast-charging power electronics, blue-white LEDs, and mercury-free medical thermometers.',
    },
    funFact: {
      id: 'Galium berwujud logam keras pada suhu ruang dingin, tetapi titik lelehnya tepat di 29,76°C sehingga sendok galium akan langsung meleleh menjadi genangan perak di telapak tangan atau di dalam teh hangat.',
      en: 'Gallium is a solid metal at cool room temperature, yet its melting point of 29.76 °C causes a gallium spoon to liquefy cleanly right inside your warm palm or a cup of hot tea.',
    },
  },
  32: {
    history: {
      id: 'Diprediksi Mendeleev sebagai "ekasilikon" dan ditemukan oleh Clemens Winkler pada 1886 di Freiberg dari mineral perak langka argyrodite, mengukuhkan kebenaran hukum periodik.',
      en: 'Predicted by Mendeleev as "eka-silicon" and discovered by Clemens Winkler in 1886 inside rare silver-rich argyrodite ore, cementing the periodic law.',
    },
    applications: {
      id: 'Serat optik internet kecepatan tinggi, lensa kamera inframerah termal militer/medis, panel surya satelit, serta paduan semikonduktor SiGe.',
      en: 'Fiber-optic communication cores, thermal infrared optics, high-efficiency space solar cells, and ultra-fast SiGe transistors.',
    },
    funFact: {
      id: 'Transistor pertama di dunia yang memicu revolusi elektronik pada 1947 di Bell Labs dibuat dari kristal germanium—bukan silikon seperti mikrochip masa kini.',
      en: 'The world’s very first working transistor invented at Bell Labs in 1947 was built from a germanium crystal—long before silicon took over computing.',
    },
  },
  33: {
    history: {
      id: 'Senyawanya dikenal para alkemis sejak Zaman Kuno; Albertus Magnus sering dicatat sebagai tokoh abad ke-13 yang berhasil memisahkan unsur arsenik metaloid murni dengan memanaskan orpimen bersama sabun.',
      en: 'Known to ancient metallurgists as realgar and orpiment; Albertus Magnus is credited in the 13th century with isolating elemental arsenic.',
    },
    applications: {
      id: 'Semikonduktor laser dan RF galium arsenida (GaAs), penguat paduan timbal baterai aki, pengawet kaca khusus, serta obat kemoterapi leukemia tertentu (As₂O₃).',
      en: 'High-speed GaAs optoelectronics and laser diodes, lead-acid battery grid hardeners, specialty glass fining, and targeted leukemia therapy.',
    },
    funFact: {
      id: 'Arsenik pernah begitu populer sebagai racun tanpa rasa dan tanpa bau dalam intrik kerajaan Eropa sehingga dijuluki "serbuk warisan" (inheritance powder) sebelum uji kimia Marsh pada 1836 menghentikannya.',
      en: 'Once notorious in European court intrigues as "inheritance powder" because its oxide was odorless and tasteless, arsenical poisoning plunged once James Marsh invented his forensic test in 1836.',
    },
  },
  34: {
    history: {
      id: 'Ditemukan oleh Jöns Jacob Berzelius dan Johan Gottlieb Gahn pada 1817 sebagai endapan merah berbau lobak busuk di dasar tangki asam sulfat Swedia, lalu dinamai dari dewi Bulan Selene.',
      en: 'Discovered by Jöns Jacob Berzelius and Johan Gottlieb Gahn in 1817 in sulfuric acid chamber sludge and named after Selene, the Greek goddess of the Moon.',
    },
    applications: {
      id: 'Sel surya film tipis CIGS, fotokonduktor mesin fotokopi dan detektor sinar-X, pewarna kaca merah delima, penghilang warna hijau kaca, dan mikronutrien antioksidan.',
      en: 'CIGS thin-film solar panels, X-ray digital imaging detectors, ruby-red glass tinting, glass decolorizing, and essential antioxidant selenoproteins.',
    },
    funFact: {
      id: 'Daya hantar listrik selenium melonjak ratusan kali lipat begitu terkena cahaya—sifat fotokonduktif inilah yang mengilhami penemuan televisi awal, pengukur cahaya kamera, dan mesin fotokopi.',
      en: 'Selenium’s electrical conductivity leaps dramatically when struck by light—this photoelectric sensitivity enabled early photophones, light meters, and xerographic copiers.',
    },
  },
  35: {
    history: {
      id: 'Diisolasi secara terpisah oleh Carl Jacob Löwig pada 1825 dan Antoine Jérôme Balard pada 1826 dari air asin rawa garam di Montpellier, lalu dinamai dari kata Yunani "bromos" (bau menyengat).',
      en: 'Isolated independently by Carl Jacob Löwig (1825) and Antoine Jérôme Balard (1826) from Mediterranean salt-marsh brines and named from Greek "bromos" (stench).',
    },
    applications: {
      id: 'Penghambat nyala api pada casing elektronik, cairan pengeboran sumur minyak berdensitas tinggi, desinfeksi spa, serta prekursor kimia fotografi perak bromida.',
      en: 'Flame retardants in electronics housings, dense oil-well completion fluids, hot-tub sanitation, and classic silver-bromide photographic film.',
    },
    funFact: {
      id: 'Bromin dan raksa adalah dua unsur tunggal dalam seluruh tabel periodik yang berwujud cair pada suhu kamar biasa, dengan uap merah-cokelat pekat yang langsung keluar dari permukaan cairan bromin.',
      en: 'Bromine and mercury are the only two elements on the periodic table that are liquid at ordinary room temperature, with dark red-brown bromine constantly fuming.',
    },
  },
  36: {
    history: {
      id: 'Ditemukan pada Mei 1898 di London oleh William Ramsay dan Morris Travers dari sisa penguapan udara cair, dinamai dari kata Yunani "kryptos" yang berarti "yang tersembunyi".',
      en: 'Discovered in May 1898 in London by William Ramsay and Morris Travers in the residue of evaporated liquid air, named after Greek "kryptos" (the hidden one).',
    },
    applications: {
      id: 'Lampu kilat fotografi berkecepatan tinggi, pengisi kaca jendela isolasi hemat energi, pendorong ion satelit ruang angkasa, dan laser eksimer litografi chip semikonduktor.',
      en: 'High-speed flash lamps, energy-saving insulated glass windows, satellite Hall-effect ion thrusters, and KrF excimer lasers for chip lithography.',
    },
    funFact: {
      id: 'Dari tahun 1960 hingga 1983, panjang resmi "1 meter" di seluruh dunia didefinisikan berdasarkan 1.650.763,73 panjang gelombang cahaya jingga-merah yang dipancarkan oleh atom Kripton-86.',
      en: 'From 1960 until 1983, the international definition of the meter was literally defined as 1,650,763.73 wavelengths of the orange-red emission line of Krypton-86.',
    },
  },
  37: {
    history: {
      id: 'Ditemukan oleh Robert Bunsen dan Gustav Kirchhoff pada 1861 di Heidelberg melalui analisis spektrum mineral lepidolit yang memperlihatkan dua garis merah tua mencolok (rubidus).',
      en: 'Discovered in 1861 in Heidelberg by Robert Bunsen and Gustav Kirchhoff via flame spectroscopy of lepidolite ore, revealing two deep ruby-red spectral lines.',
    },
    applications: {
      id: 'Jam atom rubidium ultra-presisi pada satelit navigasi GPS dan jaringan telekomunikasi, sel uap penginderaan magnet kuantum, serta pewarna ungu kembang api.',
      en: 'Compact atomic clocks inside GPS satellites and telecom base stations, quantum magnetometers, and violet-red pyrotechnic colorants.',
    },
    funFact: {
      id: 'Rubidium sangat reaktif terhadap udara dan air hingga langsung terbakar spontan bila terpapar oksigen atmosfer—dan akan mencair hanya di hari musim panas bersuhu 39,3°C.',
      en: 'Rubidium ignites spontaneously upon exposure to ambient air and melts on a hot summer day at just 39.3 °C.',
    },
  },
  38: {
    history: {
      id: 'Ditemukan sebagai senyawa baru oleh Adair Crawford dan William Cruickshank pada 1790 dari mineral desa Strontian, Skotlandia, dan diisolasi sebagai logam oleh Humphry Davy pada 1808.',
      en: 'Identified as a new earth by Adair Crawford in 1790 from ore mined in Strontian, Scotland, and isolated as pure metal by Humphry Davy in 1808.',
    },
    applications: {
      id: 'Kembang api dan suar sinyal merah tua menyala, magnet ferit permanen speaker dan motor kecil, pasta gigi khusus gigi sensitif, serta pelacakan geologi rasio Sr-87/Sr-86.',
      en: 'Crimson red fireworks and emergency flares, ferrite ceramic magnets in small motors, desensitizing toothpastes, and geological provenance tracing.',
    },
    funFact: {
      id: 'Stronsium dan kalsium sangat mirip secara kimia sehingga tubuh manusia maupun karang laut mudah memasukkannya ke dalam tulang—fitur yang dipakai arkeolog untuk melacak tempat tinggal manusia purba dari email giginya.',
      en: 'Strontium mimics calcium so closely that it incorporates into tooth enamel—allowing archaeologists to pinpoint where ancient people grew up from local rock strontium ratios.',
    },
  },
  39: {
    history: {
      id: 'Ditemukan oleh ahli kimia Finlandia Johan Gadolin pada 1794 di dalam batu hitam berat dari tambang desa Ytterby, Swedia—desa kecil yang akhirnya menyumbang nama empat unsur kimia sekaligus.',
      en: 'Discovered by Finnish chemist Johan Gadolin in 1794 inside a heavy black stone from Ytterby, Sweden—a tiny quarry village that inspired the names of four elements.',
    },
    applications: {
      id: 'Fosfor lampu LED putih dan layar OLED, laser bedah dan industri YAG (Yttrium Aluminium Garnet), superkonduktor suhu tinggi YBCO, dan keramik zirkonia stabil.',
      en: 'White LED phosphors, medical and industrial YAG lasers, YBCO high-temperature superconductors, and stabilized zirconia thermal barriers.',
    },
    funFact: {
      id: 'Sampel batuan Bulan yang dibawa pulang misi Apollo ternyata memiliki kandungan itrium jauh lebih tinggi daripada batuan kerak Bumi pada umumnya.',
      en: 'Lunar rock samples returned by the Apollo astronauts turned out to carry dramatically higher concentrations of yttrium than typical Earth crustal rocks.',
    },
  },
  40: {
    history: {
      id: 'Diidentifikasi sebagai oksida baru oleh Martin Heinrich Klaproth pada 1789 dari batu mulia zirkon; logam murninya baru berhasil diperoleh Jöns Jacob Berzelius pada 1824.',
      en: 'Identified as a new earth oxide by Martin Heinrich Klaproth in 1789 from zircon gemstones; impure metal was isolated by Berzelius in 1824.',
    },
    applications: {
      id: 'Selongsong bahan bakar reaktor nuklir karena nyaris transparan terhadap neutron, implan mahkota gigi keramik zirkonia sekeras baja, dan perhiasan kubik zirkonia.',
      en: 'Nuclear reactor fuel cladding (nearly transparent to neutrons), ultra-tough zirconia dental crowns, surgical knives, and diamond-like cubic zirconia gems.',
    },
    funFact: {
      id: 'Kristal mineral zirkon yang mengandung jejak uranium berfungsi sebagai jam waktu geologi alami; kristal zirkon tertua di Australia berusia sekitar 4,4 miliar tahun—hampir setua Bumi itu sendiri.',
      en: 'Microscopic zircon crystals preserve Earth’s oldest geological record—crystals found in Western Australia date back roughly 4.4 billion years, nearly as old as the planet.',
    },
  },
  41: {
    history: {
      id: 'Ditemukan pada 1801 oleh Charles Hatchett dari sampel mineral Amerika di British Museum dan awalnya dinamai "columbium", lalu dinamai ulang "niobium" menurut putri Tantalus, Niobe, karena kemiripannya dengan tantalum.',
      en: 'Discovered in 1801 by Charles Hatchett from a mineral specimen sent from New England; later renamed niobium after Niobe, daughter of Tantalus, for its close kinship with tantalum.',
    },
    applications: {
      id: 'Pipa baja HSLA bertekanan tinggi untuk minyak & gas, superalloy nosel roket antariksa, dan kabel superkonduktor magnet mesin MRI (paduan NbTi).',
      en: 'High-strength low-alloy (HSLA) pipeline steels, aerospace rocket engine nozzles, and superconducting NbTi magnets inside hospital MRI machines.',
    },
    funFact: {
      id: 'Menambahkan kurang dari 0,1% niobium ke dalam baja sudah mampu meningkatkan kekuatan tarik jembatan atau badan mobil secara signifikan sekaligus menghemat berat rangka.',
      en: 'Adding less than 0.1% niobium by weight dramatically strengthens structural steel beams and car frames while trimming overall steel tonnage.',
    },
  },
  42: {
    history: {
      id: 'Sering dikira bijih timbal (molybdos) sampai Carl Wilhelm Scheele membuktikannya sebagai unsur baru pada 1778, dan Peter Jacob Hjelm mengisolasi logamnya pada 1781.',
      en: 'Long confused with lead ore until Carl Wilhelm Scheele proved it held a distinct element in 1778, followed by Peter Jacob Hjelm isolating the metal in 1781.',
    },
    applications: {
      id: 'Baja perkakas berkecepatan tinggi dan suku cadang mesin tahan suhu tinggi, pelumas kering molibdenum disulfida (MoS₂), dan kofaktor enzim penambat nitrogen tanaman.',
      en: 'High-temperature steel alloys and aircraft parts, dry solid lubricant MoS₂, and the catalytic core of nitrogen-fixing enzymes in legume roots.',
    },
    funFact: {
      id: 'Tanpa sedikit atom molibdenum di bakteri akar kacang-kacangan, atmosfer nitrogen tidak bisa diubah menjadi amonia alami untuk menyokong rantai makanan tumbuhan di Bumi.',
      en: 'Without a single molybdenum atom inside nitrogenase enzymes, soil bacteria could not convert atmospheric nitrogen into natural fertilizer for Earth’s ecosystems.',
    },
  },
  43: {
    history: {
      id: 'Menjadi unsur buatan manusia pertama di dunia ketika Carlo Perrier dan Emilio Segrè pada 1937 di Palermo mendeteksinya dari pelat molibdenum yang ditembaki siklotron oleh Ernest Lawrence di Berkeley.',
      en: 'Became the first predominantly artificial element in 1937 when Carlo Perrier and Emilio Segrè isolated it in Palermo from cyclotron-irradiated molybdenum sent from Berkeley.',
    },
    applications: {
      id: 'Isotop metastabil Teknesium-99m digunakan pada lebih dari 30 juta pemindaian kedokteran nuklir dunia tiap tahun untuk memotret aliran darah jantung, tulang, dan ginjal.',
      en: 'Metastable Technetium-99m powers over 30 million diagnostic nuclear medicine scans annually to image heart blood flow, bone tumors, and kidney function.',
    },
    funFact: {
      id: 'Meskipun bernomor atom cukup ringan (Z=43, di antara molibdenum dan rutenium yang stabil), seluruh isotop teknesium bersifat radioaktif tanpa ada satu pun isotop stabil.',
      en: 'Despite sitting relatively low on the periodic table at Z = 43 between stable molybdenum and ruthenium, every single isotope of technetium is radioactive.',
    },
  },
  44: {
    history: {
      id: 'Ditemukan secara meyakinkan pada 1844 oleh ahli kimia Rusia kelahiran Estonia Karl Ernst Claus di Kazan dari residu bijih platina Pegunungan Ural dan dinamai menurut nama Latin Rusia, Ruthenia.',
      en: 'Definitively discovered in 1844 by Baltic-German chemist Karl Ernst Claus in Kazan from Ural Mountain platinum residues and named after Ruthenia (Latin for Russia).',
    },
    applications: {
      id: 'Lapisan anti-aus kontak listrik, pelapis cakram keras (hard disk) berkapasitas tinggi, katalis sintesis obat peraih Nobel (katalis Grubbs), dan sel surya peka warna.',
      en: 'Wear-resistant electrical switch contacts, perpendicular magnetic hard-drive layers, Nobel-winning olefin metathesis catalysts, and solar dye cells.',
    },
    funFact: {
      id: 'Penambahan hanya 0,1% rutenium ke dalam logam titanium mampu meningkatkan ketahanan korosi titanium hingga seratus kali lipat dalam lingkungan asam agresif.',
      en: 'Alloying just 0.1% ruthenium into titanium boosts titanium’s corrosion resistance by roughly a hundredfold in harsh acidic environments.',
    },
  },
  45: {
    history: {
      id: 'Ditemukan oleh William Hyde Wollaston pada 1803 di London tak lama setelah ia menemukan paladium dalam bijih platina mentah Amerika Selatan; dinamai dari warna larutan garamnya yang merah mawar ("rhodon").',
      en: 'Discovered by William Hyde Wollaston in 1803 in London shortly after palladium while refining South American platinum ore; named from Greek "rhodon" for its rose-colored salts.',
    },
    applications: {
      id: 'Katalis tiga arah knalpot kendaraan untuk mengurai gas beracun NOₓ, pelapis perhiasan emas putih agar mengilap keras, serta cermin optik dan termokopel suhu ultra-tinggi.',
      en: 'Automotive three-way catalytic converters breaking down toxic NOₓ emissions, ultra-bright tarnish-proof plating on white gold, and high-temperature thermocouples.',
    },
    funFact: {
      id: 'Rodium adalah salah satu logam mulia paling langka dan kerap menjadi logam non-radioaktif termahal di dunia—harganya bahkan bisa berkali lipat melampaui harga emas murni.',
      en: 'Rhodium is one of the rarest precious metals and frequently commands the highest price per gram of any non-radioactive metal—often multiples above pure gold.',
    },
  },
  46: {
    history: {
      id: 'Diisolasi oleh William Hyde Wollaston pada 1803 dari bijih platina dan sempat dijual secara anonim di sebuah toko mineral London; dinamai dari asteroid Pallas yang baru ditemukan pada 1802.',
      en: 'Isolated by William Hyde Wollaston in 1803 from platinum ore and initially sold anonymously through a London mineral shop; named after the newly discovered asteroid Pallas.',
    },
    applications: {
      id: 'Konverter katalitik kendaraan bensin, pemurni gas hidrogen ultra-murni, kapasitor keramik multilayer elektronik, dan katalis reaksi kopling silang sintesis kimia organik.',
      en: 'Gasoline catalytic converters, ultra-pure hydrogen filtration membranes, multilayer ceramic capacitors, and Nobel-winning cross-coupling organic catalysts.',
    },
    funFact: {
      id: 'Pada suhu ruang, paladium sanggup menyerap gas hidrogen hingga lebih dari 900 kali volumenya sendiri—layaknya spons logam penyimpan atom hidrogen.',
      en: 'At room temperature, metallic palladium acts like an atomic sponge, absorbing up to 900 times its own volume of hydrogen gas.',
    },
  },
  47: {
    history: {
      id: 'Dikenal dan dilebur sejak zaman prasejarah (sekitar 4000 SM di Anatolia dan Timur Dekat); simbol kimianya Ag berasal dari kata Latin "argentum" yang bermakna putih berkilau.',
      en: 'Refined since at least 4000 BCE in Anatolia and Mesopotamia; its chemical symbol Ag derives from Latin "argentum", meaning bright white.',
    },
    applications: {
      id: 'Konduktor listrik dan termal tertinggi untuk kontak elektronik presisi dan pasta sel surya, cermin reflektif berdaya pantul tinggi, perhiasan, dan pelapis antibakteri medis.',
      en: 'Highest electrical and thermal conductivity for solar-panel busbars and microelectronics, high-reflectance mirrors, fine jewelry, and antimicrobial dressings.',
    },
    funFact: {
      id: 'Satu gram perak murni bisa ditempa menjadi lembaran tembus cahaya tipis atau ditarik menjadi kawat mikro sepanjang hampir dua kilometer tanpa putus.',
      en: 'A single gram of pure silver is ductile enough to be drawn into a hairline wire nearly two kilometers long without snapping.',
    },
  },
  48: {
    history: {
      id: 'Ditemukan hampir bersamaan pada 1817 di Jerman oleh Friedrich Stromeyer dan Karl Samuel Leberecht Hermann sebagai pengotor kuning dalam sampel seng karbonat farmasi.',
      en: 'Discovered in 1817 in Germany independently by Friedrich Stromeyer and Karl Hermann as a yellow impurity inside pharmaceutical zinc carbonate samples.',
    },
    applications: {
      id: 'Panel surya film tipis kadmium telurida (CdTe), kuantum dot (QLED) layar televisi berketepatan warna tinggi, pigmen kuning-merah pelukis, serta batang kendali nuklir.',
      en: 'Cadmium telluride (CdTe) thin-film solar modules, vivid QLED display quantum dots, brilliant artist pigments, and nuclear neutron control rods.',
    },
    funFact: {
      id: 'Pelukis Impresionis seperti Vincent van Gogh dan Claude Monet memakai pigmen kuning kadmium untuk melukis bunga matahari dan kilau matahari yang jauh lebih menyala daripada cat lama.',
      en: 'Impressionist painters including Claude Monet and Vincent van Gogh embraced newly invented cadmium yellow pigments to paint sunflowers brighter than any older paint allowed.',
    },
  },
  49: {
    history: {
      id: 'Ditemukan oleh Ferdinand Reich dan Hieronymous Theodor Richter pada 1863 di Jerman saat mencari talium pada bijih seng; mereka justru melihat garis spektrum biru nila (indigo) baru yang memukau.',
      en: 'Discovered in 1863 by Ferdinand Reich and Hieronymous Theodor Richter in Freiberg while searching zinc ores for thallium, spotting instead a striking indigo spectral line.',
    },
    applications: {
      id: 'Lapisan transparan penghantar listrik Indium Tin Oxide (ITO) pada hampir seluruh layar sentuh ponsel dan monitor LCD/OLED, serta solder titik leleh rendah.',
      en: 'Transparent conductive Indium Tin Oxide (ITO) coatings essential to virtually every smartphone touchscreen and flat-panel display, plus low-melting solders.',
    },
    funFact: {
      id: 'Saat batangan logam indium murni dibengkokkan, ia mengeluarkan suara jeritan atau derit bernada tinggi yang khas ("tin cry") akibat pergeseran kembar struktur kristalnya.',
      en: 'Bending a bar of pure indium produces a sharp, audible high-pitched "cry" as countless crystal lattice planes twin and snap into new orientations.',
    },
  },
  50: {
    history: {
      id: 'Salah satu logam paling awal peradaban (sekitar 3000 SM) yang ketika dipadukan bersama tembaga menghasilkan perunggu keras; simbol Sn berasal dari nama Latin "stannum".',
      en: 'Smelted since around 3000 BCE to alloy with copper into bronze; its chemical symbol Sn comes from the Latin word "stannum".',
    },
    applications: {
      id: 'Solder bebas timbal untuk papan sirkuit elektronik modern, pelapis bagian dalam kaleng makanan anti-karat, dan proses kaca apung (float glass) di atas lelehan timah cair.',
      en: 'Lead-free electronic circuit board solder, corrosion-resistant coating inside food tin cans, and ultra-flat architectural window glass floated on molten tin.',
    },
    funFact: {
      id: 'Pada suhu dingin di bawah 13°C, timah putih perlahan mengalami "tin pest"—berubah struktur kristalnya menjadi bubuk rapuh abu-abu, yang konon membuat kancing seragam pasukan Napoleon rontok di musim dingin Rusia.',
      en: 'Below 13 °C pure white tin slowly suffers "tin pest", crumbling into brittle gray powder—legendarily blamed for disintegrating buttons on Napoleon’s winter uniforms.',
    },
  },
  51: {
    history: {
      id: 'Senyawanya (stibnit) dipakai sebagai celak mata (kohl) sejak zaman Mesir Kuno dan dideskripsikan pengolahannya oleh para alkemis Islam dan Eropa seperti Jabir ibn Hayyan serta Basil Valentine.',
      en: 'Stibnite ore served as ancient Egyptian kohl eyeliner millennia ago, with metallic isolation described by early Islamic and European alchemists.',
    },
    applications: {
      id: 'Penghambat api efektif (antimony trioxide), pengeras timbal pada pelat baterai aki dan peluru, serta komponen semikonduktor inframerah.',
      en: 'Synergistic flame retardants in plastics and textiles, lead-acid battery grid hardeners, and infrared detector semiconductors.',
    },
    funFact: {
      id: 'Tidak seperti kebanyakan logam yang menyusut saat membeku, antimon sedikit mengembang ketika memadat dari fase cair—membuatnya dulu ideal untuk mencetak huruf tajam mesin cetak Gutenberg.',
      en: 'Unlike most metals that shrink upon freezing, antimony expands slightly as it solidifies—making it invaluable for casting razor-sharp movable type in early printing presses.',
    },
  },
  52: {
    history: {
      id: 'Ditemukan oleh Franz-Joseph Müller von Reichenstein pada 1782 di Transylvania dalam bijih emas aneh, lalu dikonfirmasi dan dinamai dari Bumi (Tellus) oleh Martin Heinrich Klaproth pada 1798.',
      en: 'Discovered in 1782 by Franz-Joseph Müller von Reichenstein in Transylvanian gold ores, and confirmed and named after Earth ("Tellus") by Martin Heinrich Klaproth in 1798.',
    },
    applications: {
      id: 'Panel surya kadmium telurida, modul pendingin termoelektrik Peltier, cakram optik tulis ulang (DVD-RW), dan aditif peningkat daya olah baja serta tembaga.',
      en: 'CdTe thin-film solar cells, solid-state Peltier thermoelectric coolers, rewritable phase-change memory, and free-machining metal additives.',
    },
    funFact: {
      id: 'Menghirup atau menelan jejak kecil telurium membuat napas dan keringat seseorang berbau bawang putih menyengat selama berminggu-minggu akibat terbentuknya dimetil telurida di dalam tubuh.',
      en: 'Exposure to even microscopic amounts of tellurium causes "garlic breath" lasting days or weeks as the body metabolizes it into volatile dimethyl telluride.',
    },
  },
  53: {
    history: {
      id: 'Ditemukan secara tak terduga oleh ahli kimia Prancis Bernard Courtois pada 1811 saat mengolah abu rumput laut untuk membuat mesiu; uap ungu pekat muncul ketika terlalu banyak asam sulfat ditambahkan.',
      en: 'Discovered accidentally in 1811 by French chemist Bernard Courtois while extracting salts from seaweed ash for gunpowder, releasing a startling violet vapor cloud.',
    },
    applications: {
      id: 'Antiseptik luka Povidone-Iodine, fortifikasi garam beryodium pencegah penyakit gondok, media kontras radiologi medis, dan lampu halogen mobil.',
      en: 'Povidone-iodine antiseptics, iodized table salt preventing thyroid goiter, medical X-ray contrast agents, and high-efficiency halogen lamps.',
    },
    funFact: {
      id: 'Meskipun pada suhu ruang berwujud kristal padat hitam keunguan mengilap seperti logam, yodium langsung menyublim menjadi uap ungu dramatis saat dihangatkan tanpa melewati fase cair di tekanan normal.',
      en: 'Despite forming shiny dark metallic-looking crystals at room temperature, iodine readily sublimes into intense violet vapor when gently warmed.',
    },
  },
  54: {
    history: {
      id: 'Ditemukan oleh William Ramsay dan Morris Travers pada Juli 1898 dari fraksi terakhir udara cair setelah kripton; mereka menamainya dari kata Yunani "xenos" yang berarti "orang asing".',
      en: 'Discovered by William Ramsay and Morris Travers in July 1898 in the final residue left from liquid air, named after the Greek "xenos" meaning "stranger".',
    },
    applications: {
      id: 'Propelan pendorong ion wahana antariksa dan satelit Starlink/NASA, lampu sorot proyektor bioskop dan HID otomotif, anestesi medis khusus, serta detektor materi gelap.',
      en: 'Ion-thruster propellant for deep-space probes and satellites, cinema projection arc lamps, neuroprotective surgical anesthesia, and liquid-xenon dark-matter detectors.',
    },
    funFact: {
      id: 'Xenon mematahkan dogma kimia selama puluhan tahun ketika Neil Bartlett pada 1962 berhasil memaksanya bereaksi dengan PtF₆ membentuk senyawa kristal padat pertama dari gas mulia.',
      en: 'Xenon shattered decades of textbook dogma in 1962 when Neil Bartlett forced it to react with PtF₆, creating the first true compound of a noble gas.',
    },
  },
  55: {
    history: {
      id: 'Menjadi unsur pertama yang ditemukan murni lewat spektroskop oleh Robert Bunsen dan Gustav Kirchhoff pada 1860 di air mineral Dürkheim—mereka menamainya dari dua garis biru langit terang ("caesius").',
      en: 'The very first element discovered via spectroscopy, spotted in 1860 by Robert Bunsen and Gustav Kirchhoff in mineral water as two bright sky-blue lines ("caesius").',
    },
    applications: {
      id: 'Penentu standar waktu dunia ("detik" SI didefinisikan dari getaran atom Sesium-133), sel fotolistrik sensitif, dan cairan pengeboran sumur minyak bertekanan tinggi.',
      en: 'Primary global time standard (the SI second is defined by Cesium-133 hyperfine transitions), high-sensitivity vacuum tubes, and dense oilfield brines.',
    },
    funFact: {
      id: 'Sesium berwujud padatan logam berwarna emas pucat namun memiliki titik leleh sangat rendah (28,4°C)—ia langsung mencair di ruangan hangat—dan menjadi logam paling reaktif saat menyentuh air.',
      en: 'Cesium is a pale gold metal that melts on a slightly warm day (28.4 °C) and reacts violently enough with cold water to shatter glass containers instantly.',
    },
  },
  56: {
    history: {
      id: 'Mineral barit beratnya terkenal sebagai "batu Bologna" yang berpendar dalam gelap sejak abad ke-17; logam barium murni baru diisolasi Humphry Davy pada 1808 lewat elektrolisis.',
      en: 'Its heavy mineral barite was famed as the glow-in-the-dark "Bologna stone" since the 1600s before Humphry Davy isolated metallic barium by electrolysis in 1808.',
    },
    applications: {
      id: 'Bubur barium sulfat ("barium meal") untuk foto rontgen saluran pencernaan, lumpur pengeboran minyak bumi, kembang api hijau terang, dan superkonduktor YBCO.',
      en: 'Medical barium-sulfate X-ray contrast drinks for GI imaging, dense petroleum drilling muds, vivid green fireworks, and high-Tc superconductors.',
    },
    funFact: {
      id: 'Meskipun ion barium larut sangat beracun bagi jantung, suspensi barium sulfat (BaSO₄) yang diminum pasien rontgen sama sekali tidak larut dalam asam lambung sehingga aman keluar utuh dari tubuh.',
      en: 'Even though soluble barium ions are highly toxic, the barium sulfate swallowed before X-ray scans is so utterly insoluble that it passes safely through the stomach.',
    },
  },
  57: {
    history: {
      id: 'Ditemukan oleh Carl Gustaf Mosander pada 1839 di Stockholm ketika ia memanaskan serium nitrat dan mendapati ada oksida "tersembunyi" yang baru—karena itulah dinamai dari kata Yunani "lanthanein" (bersembunyi).',
      en: 'Discovered by Carl Gustaf Mosander in 1839 in Stockholm hidden inside cerium nitrate samples, earning a name from the Greek "lanthanein" ("to lie hidden").',
    },
    applications: {
      id: 'Kaca optik indeks bias tinggi untuk lensa kamera dan teleskop profesional, katalis pengurai minyak bumi (FCC), serta elektroda baterai mobil hibrida NiMH.',
      en: 'High-refractive-index glass for premium camera lenses, petroleum fluid catalytic cracking catalysts, and nickel-metal hydride hybrid vehicle batteries.',
    },
    funFact: {
      id: 'Setiap baterai mobil hibrida generasi klasik mengandung beberapa kilogram lantanum pada elektroda negatifnya untuk menyerap dan melepaskan hidrogen secara reversibel.',
      en: 'Classic hybrid vehicle battery packs carry several kilograms of lanthanum alloy in their negative electrodes to reversibly sponge hydrogen ions.',
    },
  },
  58: {
    history: {
      id: 'Ditemukan pada 1803 secara paralel oleh Jöns Jacob Berzelius & Wilhelm Hisinger di Swedia serta Martin Heinrich Klaproth di Jerman; dinamai menurut planet katai Ceres yang ditemukan dua tahun sebelumnya.',
      en: 'Discovered in 1803 independently by Berzelius & Hisinger in Sweden and Martin Heinrich Klaproth in Germany; named after the newly discovered dwarf planet Ceres.',
    },
    applications: {
      id: 'Batu pemantik api ferroserium (yang memercikkan bunga api saat digesek), bubuk poles kaca presisi tinggi, katalis pembersih oven, dan konverter katalitik.',
      en: 'Ferrocerium lighter flints that shower sparks when struck, precision glass-polishing slurry, self-cleaning oven coatings, and catalytic converters.',
    },
    funFact: {
      id: 'Serium adalah unsur "logam tanah jarang" (rare earth) yang sebenarnya tidak jarang sama sekali—kandungannya di kerak Bumi hampir setara dengan tembaga atau seng.',
      en: 'Despite being grouped as a "rare earth", cerium is actually about as abundant in Earth’s crust as copper and far more common than lead.',
    },
  },
  59: {
    history: {
      id: 'Dipisahkan oleh ahli kimia Austria Carl Auer von Welsbach pada 1885 ketika ia berhasil memecah bahan yang selama puluhan tahun dikira satu unsur bernama "didimium" menjadi neodimium dan praseodimium.',
      en: 'Isolated in 1885 by Austrian chemist Carl Auer von Welsbach when he painstakingly split "didymium" into two distinct elements, naming this one for its "green twin" salts.',
    },
    applications: {
      id: 'Kaca pelindung mata kuning kehijauan tukang las dan peniup kaca (kacamata didimium), paduan magnet berkekuatan tinggi bersama neodimium, dan mesin pesawat.',
      en: 'Didymium yellow-green protective goggles for glassblowers and welders, high-strength permanent magnets alongside neodymium, and aircraft magnesium alloys.',
    },
    funFact: {
      id: 'Kacamata peniup kaca yang didoping praseodimium dan neodimium secara selektif menyaring cahaya natrium kuning menyilaukan dari kaca leleh sehingga pengrajin bisa melihat bentuk kaca dengan jernih.',
      en: 'Glassblowers’ goggles doped with praseodymium and neodymium surgically block the blinding yellow sodium glare of molten glass while keeping the glowing glass clearly visible.',
    },
  },
  60: {
    history: {
      id: 'Dipisahkan bersamaan dengan praseodimium oleh Carl Auer von Welsbach pada 1885 di Wina dari mineral didimium; namanya berarti "kembaran baru" dalam bahasa Yunani.',
      en: 'Separated alongside praseodymium in 1885 by Carl Auer von Welsbach in Vienna from didymium; its name means "new twin" in Greek.',
    },
    applications: {
      id: 'Magnet permanen paling kuat di dunia (Nd₂Fe₁₄B) pada turbin angin raksasa, motor kendaraan listrik, headphone, hard drive, serta laser solid-state Nd:YAG.',
      en: 'World’s strongest permanent magnets (Nd₂Fe₁₄B) powering offshore wind turbines, EV traction motors, headphones, hard drives, and Nd:YAG medical lasers.',
    },
    funFact: {
      id: 'Dua buah magnet neodimium sebesar koin yang saling mendekat dapat menjepit jari dengan gaya puluhan kilogram hingga bisa memecahkan tulangnya atau menghancurkan magnet itu sendiri saat berbenturan.',
      en: 'A pair of coin-sized neodymium magnets can snap together with enough force to crush fingers or shatter the brittle magnet alloy upon impact.',
    },
  },
};

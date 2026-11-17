# Audit Referensi - Monopoly Periodic Table v2.1

## 1. Berkas Referensi yang Diaudit
1. **Google_AI_Studio_Master_Prompt_Monopoly_Tabel_Periodik_v2_1.md**: Spesifikasi teknis dan aturan utama (versi kanonik).
2. **Daftar_Harga_118_Unsur.json / .csv / .md**: Dataset kanonik harga 118 unsur (Rumus: `max(500, round_half_up(massa) * 100) KK`).
3. **Monopoly_Periodic_Table_Print.pdf**: Acuan visual tata letak 130 petak, warna pastel, 4 petak utama, posisi sudut & kartu edukasi.
4. **flowchart_monopoly_tabel_periodik.pdf**: Diagram alur giliran, dadu, START, penjara, flashcard, dan studi kasus.
5. **Perencanaan_Monopoly_Tabel_Periodik.docx**: Latar belakang pedagogis & konsep kimia edukasi.

---

## 2. Status Aturan: Pasti vs Draft vs Belum Diputuskan

| Kategori | Deskripsi Aturan | Status | Catatan / Implementasi |
|---|---|:---:|---|
| **Jumlah Petak** | Tepat 130 petak (118 unsur + 4 petak utama + 2 studi kasus + 2 quiz + 4 sudut) | **PASTI** | Terverifikasi dari PDF & Master Prompt |
| **Gaji START** | TIDAK ADA gaji pokok tetap saat lewat START. Hanya menerima total pendapatan perusahaan yang dimiliki. | **PASTI** | Menggantikan salary flowchart lama |
| **Harga Unsur** | Sesuai `Daftar_Harga_118_Unsur.json` (H: 500 KK s/d Og: 29.400 KK) | **DRAFT RESMI** | Preset usulan default, dapat dikonfigurasi |
| **Maintenance Sendiri** | 2 × harga dasar unsur ke bank saat mendarat di petak milik sendiri | **DRAFT RESMI** | Aturan awal kelompok |
| **Eliminasi Edukasi** | Gagal Studi Kasus 3x = Bangkrut; Gagal Quiz 7x = Bangkrut | **PASTI** | Akumulatif sepanjang permainan |
| **Flashcard Quiz** | 4 opsi pilihan ganda, timer 30 detik, dibuat dinamis oleh AI | **PASTI** | Server-side validation |
| **Studi Kasus** | AI menghasilkan konteks + tugas + rubrik; penilaian voting antartim | **PASTI** | Mayoritas tim lawan (draft) |
| **Jumlah Tim & Anggota** | 2 - 4 tim, 1 - 2 anggota per tim | **PASTI** | 4 warna pion khas |
| **Petak Utama (4)** | Pengolah Air, Listrik, Transportasi, Pertambangan. Harga draft 20.000 KK. Pajak bank 500 KK. | **DRAFT** | Fee pemilik berbasis pengali Utilities |
| **Lelang Unsur** | Pemilik menjual petak bersih. Bid awal 70% harga dasar. | **PASTI / DRAFT PARAMETER** | Minimum 70% dibulatkan ke kelipatan 100 KK |
| **Penjara & Bea Cukai** | Bea Cukai memicu masuk penjara. Kartu bebas penjara didapat dari studi kasus approved. | **PASTI / DRAFT PARAMETER** | Biaya keluar & durasi configurable |
| **Radius 2 Petak** | Denda sewa radius 2 petak saat perusahaan hancur | **BELUM DISEPAKATI** | Non-aktif default, toggleable di settings |
| **Multiplayer Mode** | Pass-and-play lokal (IndexedDB) & Online Multiplayer (Firebase Firestore) | **PASTI** | Shared game engine |
| **AI Provider** | Provider-agnostic: Gemini, OpenRouter, Claude, OpenAI | **PASTI** | Server-side API key proxy |

---

## 3. Resolusi Konflik
- **Flowchart mencatat "Ambil salary dari bank"**: Sesuai instruksi prioritas Master Prompt v2.1, fixed salary ditiadakan. Bank hanya membayar total income dari perusahaan yang dibangun pada petak unsur.
- **Tampilan massa atom vs Harga**: Tampilan ilmiah tetap presisi (misal Zr: 91.222 u, Fm: [257] u), sedangkan perhitungan harga menggunakan `massValueForPricing` bulat pada JSON data.

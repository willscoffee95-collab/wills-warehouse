# Warehouse v1.6 — Peta Jalur Kode & Rencana Stabilisasi
**Snapshot audit:** 5 November 2026. **Status:** audit & rencana; belum implementasi backend.
**Prioritas:** integritas ledger stok > kepastian status SJ > kompatibilitas outlet > UX > perampingan jumlah kode.

## Sumber kode yang telah diverifikasi
- Frontend GitHub: `index.html`, `app.js`, `bridge.js`, `config.js`, `sw.js`, `feature-v1370.js`, `wills-ui-v41.js`.
- Data operasional di Google Sheets Warehouse v1.1.1 Pilot, bukan bukti implementasi seluruh Apps Script.
- **Batas audit:** source Apps Script backend dan otorisasi runtime deployment **belum diperoleh**; jangan menyimpulkan keamanan end-to-end dari pemeriksaan frontend.

## Peta operasi (satu pintu, satu status, satu ledger)
| Operasi | Jalur frontend sekarang | Kontrak backend yang harus diverifikasi | Proteksi wajib |
|---|---|---|---|
| Permintaan outlet | UI permintaan pada `directDelivery` → detail permintaan | Sinkron request & relasi `requestId → sjId` | Tidak mengubah request asli; tidak melahirkan dua SJ untuk request sama |
| Picking | `getWarehouseRequestAvailabilityV1525` + `getWarehousePickingPricesV1526` → `saveWarehouseRequestAvailabilityV1525` | Validasi lengkap qty, role, status DRAFT, harga snapshot | 0 diperbolehkan dengan alasan; kunci admin setelah first picking; idempotent |
| Cetak | `opsPrintRequestThermalV43` / `opsPrintRequestV43` → `markWarehousePickingPrintRequestedV1526` | Audit event cetak | Cetak tidak mengurangi stok atau mengubah status DIKIRIM; dapat reprint |
| Kirim SJ | `writeDeliveryDirect` → `dispatchDelivery` | State transition DRAFT → DIKIRIM + ledger pengeluaran | Pengurangan stok tepat sekali, atomic, guard requestId/idempotency |
| Status kirim tak pasti | `dispatchPendingV44` → `getDeliveryDetailFreshV1354` | Baca status canonical + idempotency | Jangan mengirim ulang otomatis saat timeout/slow |
| Terima outlet | `syncOutletReceiptForDelivery` | Match receipt per SJ/line dan posting transit | Bedakan DITERIMA, DITERIMA_SEBAGIAN, SELISIH, SELESAI; tidak pernah otomatis dianggap lunas |
| Koreksi Owner | `directAdjustment` → `ownerPostStockAdjustmentV1527` | Otorisasi server, target fisik, ledger, transaksi idempotent | Wajib qty eksplisit; kode unik; basis unit; nomor transaksi audit; owner only |
| SO 31/10 terkunci | `directSO3110V1527` → `ownerPostStockAdjustmentV1527` | Cek idempotency SO lock + saldo historis | Jangan posting dua kali; jangan overwrite sheet SO; bukti ledger wajib |
| Purchase | `directPurchase` → method backend purchase | Snapshot harga, faktor unit, mutasi stok canonical | Harga/qty valid; tidak menduplikasi posting |
| Packing | `directPacking` → method backend packing | Source consumed, output received, yield variance | Atomic source/output/waste, guard qty negatif |
| Finance | `inventoryOnlyV1520` dan `OUTLET_PAYMENT_MODE=MANUAL_ONLY` | Pisahkan dari inventory operations | Receipt SJ ≠ payment; transaksi pembayaran offline tidak diblokir |

## Masalah yang telah dibuktikan dan perubahan
1. **Terverifikasi (bug input):** Koreksi Stok Owner sebelumnya mengkonversi input fisik kosong menjadi 0. Draft PR #15 sekarang menolak nilai kosong, bahan ganda, input tidak valid, dan meminta konfirmasi. Belum merged.
2. **Temuan audit data:** Terdapat selisih 32 dari 42 material antara `Stok Gudang` dan `Prioritas Stok Admin`. Jangan menentukan sumber stok benar sebelum ledger + SO + mutasi dihitung ulang.
3. **Temuan audit operasional:** 78 baris transit positif di 19 SJ (snapshot 5/11). Butuh bukti receipt sebelum rekonsiliasi, bukan penghapusan.
4. **Temuan master:** `TM` dan `TGM` merujuk outlet sama; pilih satu kode kanonis, alias dipertahankan untuk kompatibilitas.
5. **Temuan integrasi:** `config.js` berlabel `live-readonly` tetapi frontend punya pemanggilan write. Label bukan kontrol keamanan; server harus mengotorisasi.
6. **Temuan maintenance:** `app.js` besar (~1.984 baris di baseline), kode beberapa generasi versi masih tercampur. Jangan menghapus otomatis tanpa call graph backend.
7. **Risiko residual:** default UI snapshot cached hingga 6 jam. Pastikan semua aksi mutasi didahului fresh read dan menggunakan server sebagai sumber kebenaran.

## Aturan arsitektur target
1. **Satu jalur write per jenis mutasi**, setiap jalur memiliki idempotency key stabil dan guard concurrency di backend.
2. **Server menjadi sumber kebenaran** untuk role, qty, konversi, cost, izin cancel/koreksi, stok, dan status.
3. **Satu ledger stok canonical**; dashboard stok dan laporan prioritas adalah proyeksi yang direkonsiliasi, bukan saldo independen.
4. **Satu pemilik status SJ**: DRAFT → DIKIRIM → DITERIMA/DITERIMA_SEBAGIAN/SELISIH → SELESAI. Pembatalan hanya jalur yang sah.
5. **Pisahkan command dan query**; mencetak, memuat ulang, dan membuka halaman tidak boleh mutasi stok.
6. **Kode legacy dipetakan sebelum dihapus:** daftar caller, akibat jika hilang, kompatibilitas data lama, lalu tes regresi.

## Gate sebelum merge kode operasional
- [ ] `node --check` semua frontend JS.
- [ ] Pengujian regresi otomatis di PR hijau.
- [ ] Backend Apps Script source diverifikasi; roles & ACL tidak boleh bergantung pada sembunyi tombol.
- [ ] Dry-run transaksi di lingkungan non-produksi menggunakan duplikat sheet/fixture.
- [ ] Double click, retry timeout, interupsi jaringan, dan dua perangkat simultan tidak menulis dua mutasi.
- [ ] Picking parsial dan 0 tidak menghilangkan histori permintaan.
- [ ] Cetak ulang tidak membuat SJ baru atau mendebet stok.
- [ ] Dispatch hanya sekali; status ambigu menahan tombol kirim ulang.
- [ ] Sinkron penerimaan membedakan status diterima dan selesai; tidak memposting pembayaran.
- [ ] SO terkunci, ledger stok, purchase, packing, dan histori SJ tetap utuh.
- [ ] Bandingkan saldo dan jumlah transaksi sebelum/sesudah pada setiap outlet.
- [ ] Backup, migration plan, smoke test Owner/Admin/Staff dan rollback diverifikasi.
- [ ] Owner menyetujui rilis setelah bukti seluruh gate.

## Urutan implementasi
**P0:** guard input & idempotency/ACL backend. **P1:** rekonsiliasi ledger dengan SO dan transit yang masih terbuka. **P2:** konsolidasi status/SJ dan alias outlet. **P3:** sederhanakan modul UI dan hapus legacy yang terbukti tidak dipanggil.

## Definisi selesai
Perampingan dinyatakan selesai hanya jika fungsi operasional asli tetap berjalan, seluruh tes kritis lulus, dan tidak ada selisih ledger/status yang diperkenalkan versi baru. Tidak ada klaim *zero bug* tanpa verifikasi.

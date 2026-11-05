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
8. **Terverifikasi (pengunci dispatch):** Fungsi `dispatchApplyStatusV44` sebelumnya melepas pending lock untuk status apapun selain `DRAFT`, termasuk respons tanpa `status` atau status tidak dikenal. V1.6 fail-closed hanya mengakui `DIKIRIM`, `DITERIMA`, `DITERIMA_SEBAGIAN`, `SELISIH`, `SELESAI`; DRAFT/unknown/canceled tetap pending. Dilindungi uji regresi termasuk double click dan timeout (frontend saja, tidak membuktikan idempotency server).
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

## Tahap 3 — audit backend archival vs ledger live (6 November 2026)
**Catatan provenance:** hasil baca source ini berasal dari **arsip Code.gs v1.4.1.3, 19 Oktober 2026**, bukan source deployment aktif v1.5.2.x. Jangan mengklaim backend live sudah lolos audit tanpa perbandingan versi.

**Kontrol yang terverifikasi di source arsip:**
- `dispatchDelivery` berjalan di `withWriteLock_` (LockService ScriptLock, waitLock 30.000 ms), memeriksa sesi/permission `DELIVERY_DISPATCH`, `assertIdem_`, `idemResult_`, dan status SJ wajib `DRAFT`.
- `executePlan_` menyimpan plan dan transaksi `POSTING`, menambah event ledger masing-masing sekali, mencatat `POSTED` setelah sukses, atau `PENDING_RECOVERY` tanpa meminta user mengulang posting.
- `idemResult_` mengembalikan `{ok:true,status:'REVERSED',idempotent:true}` untuk transaction yang telah direversal. **Kontrak ini tidak boleh diterjemahkan frontend sebagai transaksi baru yang berhasil.**
- `postStockAdjustment` membatasi OWNER, menolak bahan duplikat, dan memakai plan idempotent. Tetapi penerimaan nilai numerik tanpa pengecekan input kosong secara tekstual pada helper lama menyebabkan risiko jika parameter dikirim `''` atau `null`: `Number('')=0`. PWA v1.6 menahan input kosong; server terbaru tetap wajib diperiksa.
- `syncOutletReceiptForDelivery` mengumpulkan data outlet sebelum lock, kemudian memverifikasi izin lagi di dalam lock dan melakukan commit canonical. Detail receipt/AR/transit terkunci backend perlu verifikasi ulang di versi live.

**Rekonsiliasi read-only database aktif, 6 Nov 2026:**
- 1.753 transaksi, 2.963 event ledger stok, 612 SJ, 14 recovery records semuanya RESOLVED.
- Tidak ditemukan duplikasi idempotency key transaksi, Txn ID, atau Event ID ledger stok; tidak ada Txn POSTING/PENDING aktif dalam data yang dibaca.
- **Pengecualian historis, jangan ubah otomatis:** SJ-20260927-0006 (RB), dispatch TX `DSP-20260927-143429-2C829F11C7` ada di field SJ serta memiliki dua event di Ledger Stok dan dua detail transaksi, tetapi master Transaksi Warehouse tidak memiliki baris TX tersebut. Perlu baca Audit Trail, Recovery/Transaction Plans, histori koreksi sebelum menentukan apakah orphan disengaja atau hilang.

**Perbaikan frontend draft PR #15 yang ditambahkan:**
- Tidak menganggap respons kosong/opaque, `POSTING`, `PENDING_RECOVERY` atau `REVERSED` sebagai sukses dan tidak menghapus idempotency key pada hasil tidak pasti.
- Dispatch juga menolak acknowledgements reversed/pending dan mempertahankan pengunci lokal.
- Uji otomatis memakai mock backend; tidak pernah melakukan mutasi Warehouse pada produksi.

**Gate tetap tertahan:** belum ada source Apps Script live, belum ada pengujian dua perangkat dengan lock backend live, belum ada staging yang terisolasi. Tidak merge/deploy sebelum gate itu terpenuhi.

## Tahap 4 — idempotency terikat payload, proteksi picking/finance/SO (6 Nov 2026)
**Patch frontend Draft PR #15:**
- `lockedMutationIdemV160(action, method, payload)` menyimpan fingerprint SHA-256 dari method dan payload kanonis di perangkat. Key yang belum terkonfirmasi **tidak kedaluwarsa otomatis setelah 24 jam**. Percobaan yang mengubah qty/method/note saat status sebelumnya belum pasti ditolak. Tidak menyimpan isi transaksi atau PIN dalam key lokal.
- `writeDirect` dan `writeDeliveryDirect` menggunakan key terikat payload. Kunci dihapus hanya setelah ack valid; dispatch masih wajib fresh SJ status.
- `saveWarehouseRequestAvailabilityV1525` (picking) kini memakai key terikat payload, membaca ulang SJ, memverifikasi qty tiap baris, dan baru melepaskan key setelah hasil readback cocok. Angka 0 fisik tetap sah saat diinput eksplisit.
- Koreksi SO Owner tidak lagi menampilkan sukses pada respons `POSTING`, `REVERSED`, null, atau ambigu.
- `saveFinancialPositionActualV1300` sekarang lewat `writeDirect` yang memerlukan ack valid dan key terikat jumlah saldo Bank/Kas dan catatan. Source arsip 1.4.1.3 mengonfirmasi method ini mengembalikan `ok:true` saat berhasil, tetapi source deployment masih harus dicocokkan.
- **41 pengujian otomatis** di `tests/*.test.cjs` + JS syntax-check lulus pada GitHub Actions workflow `Warehouse frontend safety`. Unit test berbasis mock, bukan uji backend produksi.
- `idemKey` legacy masih digunakan pada event log cetak, yang tidak memutasi stok; jalur lain perlu audit lanjutan setelah verifikasi backend.

**Audit forensik orphan dispatch SJ-20260927-0006:**
- `Transaction Plans`, `Ledger Stok`, `Ledger Transit`, `Detail Transaksi`, dan `Audit Trail` mengonfirmasi aksi dispatch historis pada 27 September.
- TX induk `DSP-20260927-143429-2C829F11C7` tidak ditemukan di `Transaksi Warehouse` aktif **maupun** backup Warehouse 26 Oktober.
- Plan mencakup dua efek stock, UHT −3000 gr dan Whip Cream −975 gr; tidak boleh menyimpulkan saldo saat ini salah sejumlah tepat ini tanpa menelusuri SO dan mutasi selanjutnya.
- Tindak lanjut read-only dilacak di [Issue #16](https://github.com/willscoffee95-collab/wills-warehouse/issues/16).
- **Jangan memulihkan dengan dispatch baru, zero transit, atau adjustment stok tanpa analisis dan approval Owner.**

**Kekurangan yang belum ditutup:**
- Mutasi melalui dua browser/perangkat secara simultan masih memerlukan verifikasi backend live untuk penguncian global dan identitas transaksi bisnis. Perangkat berbeda dapat menghasilkan key berbeda.
- Tidak semua modul addon Apps Script terbaru dapat diaudit dari arsip 19 Okt. Data Sheets dan GitHub frontend tidak membuktikan deployment runtime.
- Key yang tertahan karena hasil ambigu membutuhkan prosedur recovery Owner yang aman, bukan tombol reset otomatis.

## Tahap 5 — pengamanan versi cache PWA (6 November 2026)
- `index.html` memuat `app.js?v=1.6.0-safety-rc1` dalam branch Draft.
- `sw.js` cache name dan daftar `app.js` mengikuti versi sama. SW install memiliki daftar aset lokal yang dicek dengan pengujian otomatis.
- Ketika jaringan putus, Service Worker hanya boleh mengembalikan `index.html` sebagai fallback **navigasi**, bukan mengembalikan HTML untuk file JavaScript yang tidak tersedia.
- Penamaan `safety-rc1` adalah versi **release candidate di branch Draft**; GitHub Pages produksi di `main` belum berubah.
- Pengujian `tests/warehouse-pwa-cache.test.cjs` memastikan semua aset tersedia dan versi script konsisten.
- Source `sw.js` memakai strategi network-first bagi navigasi dan core assets; setelah rilis, uji update dari PWA terpasang (Chrome Android/iPhone) dan rollback cache tetap wajib.

## Tahap 6 — dispatch lock persisten dan pemulihan bridge (6 November 2026)
- **Bug guard confirmed:** `dispatchStorePendingV44` sebelumnya mengabaikan exception dari `localStorage.setItem`. Gagal menyimpan pengunci bisa membuat `dispatchDelivery` tetap dipanggil dari PWA tanpa bukti pengunci persisten.
- Guard sekarang **fail-closed**: input idempotency key wajib, status pengunci tidak dapat dibaca/JSON rusak dihitung sebagai *pending*, pengunci disimpan dan dibaca ulang **sebelum** `bridge.call('dispatchDelivery')`. Jika browser menolak storage, pengiriman tidak dilakukan.
- `bridge.js`: READY pertama yang sah diikat ke channel selama satu inisialisasi; READY berikutnya dari sumber lain tidak bisa mengganti channel. Jika startup tidak merespons dalam 15 detik, iframe lama dibuang dan inisialisasi berikutnya dapat dicoba **hanya lewat tindakan pengguna**, tanpa memutar ulang RPC.
- `bridge.call`: exception `postMessage` langsung menggagalkan permintaan, membersihkan timer dan entri pending; timeout 3 menit tetap tidak memicu retry otomatis.
- `index.html` dan `sw.js` sekarang memuat `bridge.js?v=1.6.0-safety-rc1` bersama `app.js?v=1.6.0-safety-rc1`, sehingga cache PWA kandidat tidak mencampur bridge lama dan baru.
- GitHub Actions menjalankan **60 tes regresi** (termasuk 8 kasus dispatch storage dan 7 kasus reconnect/response bridge) beserta syntax-check JavaScript. Semua tes adalah browser/mock unit tests; status runtime Apps Script **belum** diuji.

**Batas keamanan yang tetap ada:** pesan READY dari origin Google terpercaya belum memakai nonce/attestation yang dibuktikan oleh backend, karena source Bridge.html aktif tidak tersedia. Jangan mengklaim keamanan komunikasi end-to-end tanpa memeriksa HTML service live. PWA juga belum membuktikan idempotency lintas browser/perangkat yang memakai penyimpanan terpisah.

**Gate tetap:** Draft PR #15 tidak di-merge/deploy; tidak ada mutasi gudang, ledger, SO, atau status SJ produksi dalam tahap ini.

# WILLS WAREHOUSE — SO 31 OKTOBER & KUNCI ADMIN (V1.5.2.9)

**Saat ini data SO fisik sudah ditulis ke spreadsheet sebagai TAB TERPROTEKSI, tetapi LEDGER STOK BELUM DIKOREKSI.**
Google Sheets [SO 31-10-2026 TERKUNCI](https://docs.google.com/spreadsheets/d/1WiK618a6iFkulq-EnvfUl7I4k2rWm_0RE-SwanLPw0A/edit#gid=1910312026).

## Fakta
- SO tanggal 31 Oktober; 27 bahan dengan fisik awal sebelum kirim 1 November.
- 16 bahan punya selisih, 11 cocok; 31 mutasi ledger 1 November sudah diperhitungkan.
- Saldo operasional tidak boleh diubah langsung melalui cells Stok Gudang D:D atau Ledger Stok.
- Koreksi menggunakan `postStockAdjustment` yang sudah aktif, tetapi hanya lewat Owner wrapper `ownerPostStockAdjustmentV1527`.
- UI menampilkan saldo live + delta SO, bukan menimpa stok terkini dengan nilai SO awal.
- Delta (satuan dasar): B01 -5000; B03 -1000; B04 -1950; B05 -6000; B06 -2000; B09 -112; B07 -2370; B08 +1200; B12 -1001; B15 -100; B20 -7; B22 -20; B-LMN -300; WH-STIK-MIXER-HAND +2; B-SAR -990; WH-BATERAI-AAA -2.
- Hanya 2 bahan positif memerlukan modal: Matcha packing (+1200 gr) dan Stik Mixer (+2 pcs). Untuk Stik Mixer input modal aktual dari bukti pembelian; **jangan gunakan harga internal outlet Rp55.000 sebagai modal tanpa bukti**.
- Key idempotency deterministik lintas perangkat: `SO3110_2026_STOCK_BASELINE_OWNER_LOCKED_ONCE_V1527`. Jangan membuat key baru untuk mengulang transaksi yang statusnya belum pasti.

## Instalasi GAS (PENTING: BACKEND SEBELUM FRONTEND)
1. Di Apps Script gudang yang sudah aktif, buka **file EXISTING** `Code_Request_Picking_V1525.gs`. **GANTI isinya** (jangan tambah file duplikat dengan fungsi nama sama) memakai berkas GitHub di branch PR ini: `backend-addon/Code_Request_Picking_V1525.gs`.
2. Buka `Bridge.html` di Apps Script, ganti seluruhnya memakai `backend-addon/Bridge_V1527_OWNER_LOCK.html`.
   - Tiga akses lama `postStockAdjustment`, `adjustDeliveryDraftFulfillment`, `cancelDeliveryDraft` **dikeluarkan dari allowlist**.
   - Diganti dengan `ownerPostStockAdjustmentV1527`, `ownerAdjustDeliveryDraftFulfillmentV1527`, `ownerCancelDeliveryDraftV1527`.
   - Request read-only, initial picking, cetak, dan `dispatchDelivery` tetap diizinkan melalui permission canonical.
3. Jalankan editor-only `ww1527OwnerAccessAuditReadOnly`. Harus `ok:true`, `protectedBySheet:true`, 27 materials/16 adjustments dan tiga wrapper terpasang. **Ini audit read-only; belum memposting stok**.
4. Perbarui **existing** Web App deployment (Manage deployments → Edit → New version → Deploy; URL /exec tetap).
5. Baru merge PR frontend ini, lalu pastikan workflow GitHub Pages success.

## Owner posting koreksi melalui UI resmi
1. Login akun **OWNER**, buka menu **Opname/Koreksi → Rekonsiliasi SO Fisik 31 Oktober · Owner**.
2. Buka preview 16 item; pastikan selisih SO dan unit.
3. Isi *modal asli per unit* untuk tambahan stok (untuk Stik Mixer wajib dari bukti).
4. Klik **Review & Posting Koreksi (Owner)** dan konfirmasi.
5. Verifikasi transaksi STOCK_ADJUSTMENT dengan idempotency SO dan 16 event pada Ledger Stok; periksa saldo 27 bahan. **Baru setelah itu nyatakan stok operasional dikoreksi & dikunci.**
6. Jika respons timeout / belum pasti: **jangan posting ulang** tanpa audit transaksi yang sudah tercatat.

## Aturan Admin
- ADMIN, ADMIN_2, STAFF_GUDANG, STAFF_LOGISTIK bisa melakukan pengecekan pertama kali dan menyiapkan/cetak sesuai permission mereka.
- Setelah catatan picking tersimpan sekali atau telah ada FADJ sebelumnya, **semua non-Owner dilarang mengedit** (server guard + form locked).
- Owner saja boleh revisi fulfillment DRAFT SJ, membatalkan SJ, koreksi saldo.
- Admin tidak bisa lewat legacy Bridge untuk membypass peraturan.
- DRAFT → DIKIRIM → DITERIMA → SELESAI tetap dipertahankan.

## Keterbatasan yang harus diketahui
- Tab SO adalah audit locked reference; saldo live `Stok Gudang` belum berubah hingga POST adjustment.
- Data Stock Adjustment core tidak ada di repo GitHub; tidak diganti/ditimpa. Gunakan fungsi core yang ada.
- Tidak ada reversal transaksi, closebook, pengubahan Bank/Kas/AR/AP/HPP, atau pemasangan trigger.

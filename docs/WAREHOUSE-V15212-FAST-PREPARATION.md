# Wills Warehouse — alur SJ ringkas dan cepat (kandidat v1.5.2.12)

**Status:** kode tersedia hanya di Draft PR #19. **BELUM DEPLOY**; backend core `dispatchDelivery` produksi belum terbukti menjalankan verifikasi dalam lock. Pekerjaan ini memengaruhi keselamatan mutasi stok, jadi tidak boleh langsung digabung ke `main`.

## Cara kerja staf

1. Outlet mengirim permintaan bahan. Request sync yang sudah ada menghubungkan permintaan ke Surat Jalan `DRAFT`. Jika SJ belum terhubung (`MISSING_SJ`), jangan membuat dispatch; sinkronkan permintaan melalui fungsi existing.
2. Staf klik SJ pada outlet terkait → **Siapkan Bahan**. Jumlah aktual dapat dikurangi dari jumlah diminta; **0 diizinkan dengan alasan**. Tidak boleh melebihi permintaan.
3. Klik **Selesai Disiapkan**. Sistem menyimpan jumlah akhir ke fulfillment adjustment existing dengan audit dan idempotency. Admin tidak bisa mengubahnya lagi. Owner menggunakan prosedur koreksi resmi bila diperlukan.
4. Staf klik **Cek Ulang**, mencocokkan setiap jumlah fisik dan alasan kekurangan, mencentang konfirmasi fisik, lalu klik **Selesai Cek Ulang**. Backend mencatat `reviewId` di Audit Trail dan status ringkas tahan lama.
5. Status persiapan menjadi `SIAP_KIRIM` (bukan status SJ canonical). Tombol **Konfirmasi Kirim** tersedia hanya jika baca backend membuktikan status ini dan role mengizinkan.
6. Setelah core mengonfirmasi perubahan SJ menjadi `DIKIRIM`, tombol **Cetak SJ Thermal** muncul. Struk `SIAP KIRIM` menggunakan jumlah aktual yang dikirim. Cetak tidak menambah atau mengurangi ledger.

Status persiapan internal: `MENUNGGU_DISIAPKAN` → `SIAP_CEK_ULANG` → `SIAP_KIRIM`. Status SJ canonical tetap `DRAFT` sampai `DIKIRIM`, kemudian mengikuti `DITERIMA/SELESAI` dari sistem existing.

## Teknik optimasi loading

- Daftar SJ, tab outlet, dan jumlah DRAFT menggunakan data modul yang telah ada; mengganti outlet **tanpa round-trip** tambahan.
- Masuk detail SJ memerlukan **satu request backend status persiapan**, bukan mengambil harga internal dan seluruh modul gudang.
- Pembacaan status yang berulang dalam satu layar dicoalesce dan cache **12 detik** per request; data penting sebelum dispatch tetap diverifikasi ulang di backend. Cache lokal tidak pernah menjadi izin posting.
- Setelah Selesai Disiapkan, hanya baca status persiapan request itu kembali; tidak perlu `reloadDeliveryModule()` penuh.
- Backend verifikasi menggunakan `PropertiesService.getScriptProperties()` untuk satu key per SJ; audit fisik tetap di Audit Trail, tetapi pembacaan status **tidak memindai ribuan baris Audit Trail** lagi.
- Tidak ada klaim waktu loading dalam detik karena latency Google Apps Script dan koneksi perangkat belum diukur di staging. Spinner tetap terlihat saat request diperlukan, tanpa memblokir seluruh layar.

## File kandidat

- `backend-addon/Code_Preparation_V15212.gs`: tiga fungsi bridge, fast verification record, role check, dan validasi barang.
- `backend-addon/Bridge_V15212_PREP_VERIFIED.html`: rute `dispatchDelivery` raw ditutup, rute `dispatchWarehouseVerifiedV15212` ditambah.
- `app.js`, `app.css`, `index.html`, `sw.js`: UX ringkas, loading dan cache version `1.5.2.12-preparation`.
- `tests/warehouse-preparation-lifecycle.test.cjs` dan tes regresi sebelumnya.

## PENTING — gate atomic core (masih terbuka)

Wrapper `dispatchWarehouseVerifiedV15212` memverifikasi persiapan **sebelum** menyerahkan ke core `dispatchDelivery`, sehingga tetap mungkin terjadi perubahan qty oleh Owner atau request lain di antara pemeriksaan dan perolehan core write lock (**TOCTOU**). Wrapper **belum cukup aman untuk produksi**, meskipun test mock lulus.

Sebelum deploy, harus tersedia kode Apps Script **yang benar-benar aktif**. Integrasikan pengecekan `requestId`, `sjId`, `reviewId`, verified property, keseluruhan baris qty/reason, status `DRAFT` dan minimal satu qty positif **di dalam write lock core dispatch**, tepat sebelum rencana stock-ledger diposting. Pastikan pengecekan ini tidak me-reset idempotency atau menyebabkan duplicate posting lintas dua perangkat. Bila permintaan direvisi oleh Owner setelah Cek Ulang, verifikasi lama harus gugur dan prosedur koreksi perlu menentukan cara membuka ulang persiapan.

Kemudian deploy addon & Bridge **bersamaan** di staging terisolasi, uji hak akses Admin vs Owner, 0 quantity/partial, keraguan status timeout/offline, 2 perangkat kirim bersamaan, cetak RawBT, serta flow stok gudang dan penerimaan outlet. Dokumentasikan readback audit, ledger dan rollback sebelum Owner mengizinkan produksi. Jangan menjadikan source `v1.4` terarsip sebagai bukti core yang sekarang deployed.

**Tidak ada stock, ledger, Surat Jalan, ataupun SO 31-10-2026 produksi yang diubah oleh Draft PR ini.**

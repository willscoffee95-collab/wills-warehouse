# Wills Warehouse — GitHub Front-end Shell v0.1.0

Cangkang front-end **Wills Warehouse** untuk preview di GitHub Pages.

## Status

- UI / PWA shell: siap.
- Mobile-first + desktop responsive: siap.
- Logo Wills Warehouse: sudah dipasang.
- Manifest + Service Worker: siap untuk GitHub Pages (HTTPS).
- Backend produksi: **belum dihubungkan**.
- Semua data pada repo ini: **demo / mock data**.

## Penting

Versi shell ini sengaja **tidak memiliki koneksi ke Apps Script produksi**. Menekan tombol transaksi hanya membuka prototype bottom sheet. Karena itu repo aman dipakai untuk mengembangkan tampilan tanpa mengubah stok, kas, ledger, Surat Jalan, packing, atau data Warehouse yang sedang berjalan.

## Preview lokal

```bash
python -m http.server 8080
```

Lalu buka `http://localhost:8080`.

## Deploy GitHub Pages

1. Buat repository GitHub, misalnya `wills-warehouse`.
2. Upload seluruh isi folder ini ke root repository.
3. Commit & push ke branch `main`.
4. Buka **Settings → Pages**.
5. Pada **Build and deployment**, pilih **Deploy from a branch**.
6. Pilih branch `main` dan folder `/ (root)`.
7. Save.

GitHub akan memberikan URL Pages seperti:

`https://USERNAME.github.io/wills-warehouse/`

## Integrasi backend nanti

File `assets/js/config.js` sudah disiapkan sebagai titik konfigurasi. Saat API gateway/backend baru sudah siap, isi `API_URL` dan ubah `MODE` dari `demo` menjadi konfigurasi production yang kita sepakati.

**Jangan menempel URL Apps Script produksi dan mengaktifkan write API sebelum auth, CORS, idempotency, dan compatibility gate selesai diuji.**

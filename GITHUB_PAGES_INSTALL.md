# Instalasi ke GitHub Pages

Paket ini adalah **front-end shell**, bukan pengganti backend Wills Warehouse saat ini.

### Cara tercepat

1. Extract ZIP.
2. Buat repo GitHub baru.
3. Upload semua file dan folder di dalam paket (jangan upload folder pembungkusnya saja).
4. Settings → Pages → Deploy from a branch.
5. Branch `main`, folder `/ (root)` → Save.
6. Tunggu deployment selesai lalu buka URL GitHub Pages.

### PWA di Android

Setelah Pages aktif lewat HTTPS, buka dari Chrome → menu `⋮` → **Tambahkan ke layar utama / Install app**.

### Batas versi shell

- Login hanya demo.
- Angka dashboard dummy.
- Tombol transaksi tidak posting apa pun.
- Tidak ada akses Google Sheet.
- Tidak ada koneksi ke Apps Script produksi.

Ini disengaja agar desain dapat dikembangkan di GitHub tanpa risiko terhadap sistem aktif.

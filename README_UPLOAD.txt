WILLS WAREHOUSE GitHub FLAT v0.1.3 — Cache + Name Fix

Masalah yang diperbaiki:
- Nama literal ${d.user.name} tidak lagi bisa muncul: greeting memakai concatenation biasa.
- index.html memakai cache-busting ?v=0.1.3 untuk app.css, config.js, app.js.
- service worker diubah menjadi network-first untuk HTML/JS/CSS inti.
- service worker didaftarkan dengan updateViaCache: 'none'.

UPLOAD:
Ganti minimal file berikut di root repository:
1. index.html
2. app.js
3. config.js
4. sw.js

Setelah GitHub Pages selesai deploy, buka SEKALI:
https://willscoffee95-collab.github.io/wills-warehouse/?v=0.1.3

Login demo lagi. Target greeting:
Selamat malam, Wilyanto

Sesudah itu URL normal boleh dipakai kembali.

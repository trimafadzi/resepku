# Buku Resep — Recipe Organizer & Medicine Cabinet

Buku Resep adalah aplikasi mobile (*React Native / Expo*) berbasis Bahasa Indonesia yang berfungsi sebagai pengatur resep masakan dengan tampilan editorial premium. Aplikasi ini dilengkapi dengan fitur sosial (*Sosmed*) untuk membagikan resep secara publik tanpa akun (menggunakan profil tamu lokal), pembuat kolase foto makanan otomatis (*Collage Maker*), pembuat caption bertenaga AI (*AI Caption Generator*), serta modul pelacakan obat pribadi (*Obatku*) dengan asisten informasi medis bertenaga AI.

---

## 🌟 Fitur Utama

### 1. Buku Resep (Lokal)
*   **Home Feed Premium**: Tampilan visual editorial premium dengan *featured hero*, pencarian resep berdasarkan judul atau bahan, filter kategori *chip*, dan pengelompokan resep (Sarapan, Makan Siang, Makan Malam, Pencuci Mulut, Camilan).
*   **Mode Masak (Cook Mode)**: Mode panduan langkah-demi-langkah layar penuh dengan fitur pencegah layar mati (*keep-awake*).
*   **Impor Resep Otomatis**: Impor resep langsung dari URL menggunakan parser terstandarisasi schema.org JSON-LD.
*   **Pre-seeded Recipes**: Dilengkapi 5 resep masakan Indonesia pilihan siap pakai saat pertama kali dijalankan.

### 2. Jejaring Sosial / Sosmed (Awan, Tanpa Registrasi Akun)
*   **Profil Tamu (Guest Profile)**: Nama dapur, emoji avatar, dan deskripsi bio yang disimpan lokal via *AsyncStorage* dan disinkronisasikan ke database awan.
*   **Feed & Jelajah**: Tab *Feed* menampilkan postingan sendiri serta dapur yang diikuti, sedangkan tab *Jelajah* untuk menemukan resep publik menarik dari dapur lain.
*   **Collage Maker**: Unggah dan gabungkan hingga 4 foto makanan menjadi satu kolase menarik secara otomatis saat membagikan resep (kolase horizontal untuk 2 foto, kolase grid 2x2 untuk 3-4 foto).
*   **AI Caption Generator**: Membuat caption menarik gaya *food blogger* Indonesia secara instan berbasis AI Gemini atau template lokal Bahasa Indonesia.

### 3. Obatku (Lokal + Pencarian Medis AI/Offline)
*   **Koleksi Obat Pribadi**: Simpan daftar obat aktif atau referensi harian Anda secara lokal.
*   **Pencarian Medis Pintar**: Cari detail medis obat dengan ketikan nama. 
    *   Mencari di dataset farmasi lokal offline (`indonesian_drugs.json`) terlebih dahulu dengan pencarian persis atau pencarian kemiripan kata (*fuzzy match*).
    *   Menggunakan AI Gemini jika data tidak ditemukan di lokal dan kunci API terkonfigurasi.
*   **Formulir Medis Terstruktur**: Menyediakan data detail medis yang mencakup: **Komposisi**, **Dosis & Aturan Pakai**, **Kegunaan & Indikasi**, **Efek Samping**, **Peringatan & Kontraindikasi**, serta **Merek Dagang**.
*   **Koreksi Otomatis Typo**: Menampilkan banner peringatan koreksi kata jika terdapat kesalahan penulisan nama obat (contoh: menulis `paracetmol` otomatis menampilkan data `Paracetamol`).

### 4. Pengaturan Sistem
*   Konfigurasi Alamat API Backend (*Base URL*).
*   Konfigurasi *Gemini API Key* dan pilihan Model AI (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-flash`).

---

## 🛠️ Panduan Pengembangan & Cara Menjalankan

### Persyaratan Sistem
*   **Node.js** (v18 ke atas) & **Yarn** atau **npm**
*   **Python** (v3.10 ke atas)
*   **MongoDB** berjalan secara lokal di port default (`mongodb://localhost:27017`)

---

### 1. Menjalankan Backend (FastAPI)

1.  Masuk ke direktori backend:
    ```bash
    cd backend
    ```
2.  Aktifkan virtual environment Python:
    *   **Windows (PowerShell):**
        ```powershell
        .venv\Scripts\Activate.ps1
        ```
    *   **macOS / Linux:**
        ```bash
        source .venv/bin/activate
        ```
3.  Pastikan dependensi telah terinstal:
    ```bash
    pip install -r requirements.txt
    ```
4.  Pastikan MongoDB Anda sudah berjalan, lalu jalankan server backend FastAPI:
    ```bash
    uvicorn server:app --reload --port 8000
    ```
    Server akan aktif di `http://localhost:8000`.

---

### 2. Menjalankan Frontend (Expo / React Native)

1.  Masuk ke direktori frontend:
    ```bash
    cd frontend
    ```
2.  Instal dependensi menggunakan Yarn (atau npm):
    ```bash
    yarn install
    ```
3.  Jalankan aplikasi Expo:
    ```bash
    yarn start
    ```
4.  Tekan tombol yang sesuai di terminal untuk membukanya di emulator Android (`a`), emulator iOS (`i`), atau versi web (`w`).

---

### 3. Menjalankan Pengujian Unit & Integrasi (Pytest)

Pengujian backend mencakup **25 unit & integration tests** yang memverifikasi seluruh fungsi impor resep, modul sosial (user upsert, posting, follows, feed, discover), collage maker, caption generator, dan asisten info obat.

1.  Masuk ke direktori backend:
    ```bash
    cd backend
    ```
2.  Aktifkan virtual environment Anda.
3.  Jalankan perintah pengujian:
    ```bash
    .venv\Scripts\pytest -v
    ```

---

## 📂 Struktur Folder Proyek

```text
resepku/
├── backend/
│   ├── data/
│   │   └── indonesian_drugs.json   # Dataset obat offline lokal
│   ├── tests/
│   │   ├── conftest.py             # Setup fixture pengujian & mock server HTML
│   │   ├── test_recipes_import.py  # Uji impor resep JSON-LD
│   │   └── test_social.py          # Uji endpoint sosmed, kolase, caption, & obat
│   ├── .env                        # Konfigurasi MongoDB & Gemini API Key backend
│   ├── server.py                   # Server utama FastAPI & endpoint routing
│   └── requirements.txt            # Dependensi Python
│
├── frontend/
│   ├── app/                        # Halaman aplikasi (Expo Router)
│   │   ├── _layout.tsx             # Layout utama & konfigurasi navigasi
│   │   ├── index.tsx               # Home screen buku resep
│   │   ├── settings.tsx            # Pengaturan URL API & Kunci Gemini
│   │   ├── obatku.tsx              # Manajemen & pencarian obat pribadi
│   │   └── sosmed/                 # Halaman feed sosial, profil dapur, & sharing
│   │       ├── onboarding.tsx      # Setup profil tamu
│   │       ├── share.tsx           # Bagikan resep (dengan foto & AI caption)
│   │       └── dapur/[id].tsx      # Profil dapur pengguna lain/diri sendiri
│   │
│   ├── src/
│   │   ├── components/             # Komponen visual (AppDrawer, PostCard, dll.)
│   │   ├── store/                  # Manajemen state & client API (social, drugs, settings)
│   │   └── theme/                  # Desain sistem & palet warna premium
│   └── package.json                # Dependensi React Native
│
└── memory/
    └── PRD.md                      # Product Requirement Document resmi
```

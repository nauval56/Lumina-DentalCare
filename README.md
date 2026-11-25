<div align="center">

# Lumina Dental Care

**Senyum Cerah Dimulai Dari Perawatan Terbaik**  
Sistem Informasi Manajemen Klinik Gigi Modern Berbasis Web  
*(Satu Klinik · Satu Cabang · Bahasa Indonesia · Rupiah IDR)*

[![Nuxt 4](https://img.shields.io/badge/Nuxt-4.0-00DC82?style=flat-square&logo=nuxt.js&logoColor=white)](https://nuxt.com/)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Lumina_System-137A7F?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.6_MySQL-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-10%2F10_Passing-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)

</div>

---

Aplikasi web manajemen klinik gigi terintegrasi yang dibangun menggunakan **Nuxt 4**, **Vue 3 Composition API**, **TypeScript**, **Tailwind CSS**, **Nuxt UI**, **Pinia**, **VueUse**, **ApexCharts**, dan **Prisma ORM (`mysql` provider)** yang kompatibel dengan **MySQL / TiDB Cloud**.

## Daftar Isi

- [1. Area Pengguna & Fitur Utama](#1-area-pengguna--fitur-utama)
- [2. Aturan Bisnis Klinis & Otomasi](#2-aturan-bisnis-klinis--otomasi)
- [3. Teknologi yang Digunakan](#3-teknologi-yang-digunakan)
- [4. Struktur Proyek](#4-struktur-proyek)
- [5. Panduan Instalasi & Menjalankan Lokal](#5-panduan-instalasi--menjalankan-lokal)
- [6. Akun Demo Development](#6-akun-demo-development)
- [7. Pengujian & Verifikasi](#7-pengujian--verifikasi)
- [8. Catatan Layanan Eksternal](#8-catatan-layanan-eksternal)

---

## 1. Area Pengguna & Fitur Utama

### A. Website Publik
> Rute: `/` · `/about` · `/services` · `/doctors` · `/articles` · `/reviews` · `/contact`

- **Beranda (`/`)**: Hero visual klinik, tab kategori layanan interaktif terhubung ke database, pratinjau ruang tindakan & tur virtual 3 foto fasilitas, profil dokter spesialis utama, jadwal operasional mingguan, serta pemberitahuan hari libur dan penyesuaian jam praktik terdekat.
- **Tentang Klinik (`/about`)**: Visi, misi, protokol sterilisasi Autoklaf Kelas B, dan galeri foto fasilitas klinis.
- **Katalog Layanan (`/services`)**: Daftar tindakan klinis lengkap dengan foto kategori, tarif transparan (IDR), estimasi durasi, detail prosedur, dan tombol booking langsung.
- **Direktori Dokter & Jadwal (`/doctors`)**: Profil dokter gigi, SIP, biaya konsultasi, dan jadwal praktik mingguan yang terintegrasi secara *real-time*.
- **Artikel & Ulasan (`/articles`, `/reviews`)**: Artikel edukasi kesehatan gigi dengan foto sampul serta ulasan pasien terverifikasi dengan rating bintang interaktif (`1–5`).

### B. Patient Portal (`/patient/*`)
- **Dashboard Pasien (`/patient`)**: Ringkasan jadwal kunjungan berikutnya, status antrean, tagihan, dan notifikasi.
- **3-Step Booking & Kalender Interaktif (`/patient/appointments`)**:
  1. **Layanan & Dokter**: Memilih tindakan perawatan dan dokter spesialis.
  2. **Tanggal & Slot Waktu**: Kalender interaktif yang otomatis mengunci hari Minggu (`Libur`), tanggal merah nasional Indonesia (`Libur` + nama hari libur), serta libur khusus (`Klinik Tutup`). Tanggal dengan pengurangan jam ditandai `Jam Praktek Terbatas` dengan slot waktu 30/60 menit yang otomatis menyesuaikan jam aktif, waktu terlewat, dan slot yang sudah terisi.
  3. **Keluhan & Konfirmasi**: Ringkasan kunjungan dan validasi anti *double-booking* di sisi server.
- **Riwayat Medis & Odontogram (`/patient/medical-history`)**: Akses rekam medis SOAP, resep obat, dan peta odontogram *read-only* sesuai usia pasien.
- **Tagihan & Pembayaran (`/patient/payments`)**: Daftar invoice resmi, simulasi pembayaran gateway, dan kwitansi.

### C. Doctor Portal (`/doctor/*`)
- **Dashboard Dokter (`/doctor`)**: Antrean ruang periksa *real-time*, daftar kunjungan hari ini, dan pintasan rekam medis.
- **Daftar Appointment Dokter (`/doctor/appointments`)**: Filter status kunjungan dengan tombol aksi langsung **Mulai Pemeriksaan** dan **Odontogram**.
- **Rekam Medis SOAP & Resep FEFO (`/doctor/medical-records`)**: Pencatatan keluhan (S), pemeriksaan objektif (O), diagnosis ICD-10 (A), rencana/tindakan (P), resep obat terintegrasi FEFO, serta pengiriman otomatis ke tagihan Admin.
- **Odontogram FDI Berbasis Usia (`/doctor/odontogram`)**: Visualisasi hingga 52 gigi FDI yang menyesuaikan kelompok usia pasien secara otomatis.

### D. Receptionist Portal (`/receptionist/*`)
- Pendaftaran pasien baru dengan pencegahan duplikasi data (NIK, nomor telepon, dan email).
- Check-in kunjungan, pengelolaan antrean pasien (`WAITING`, `CALLED`, `IN_PROGRESS`, `COMPLETED`), dan verifikasi kasir.

### E. Admin Dashboard (`/admin/*`)
- **Overview & Analitik (`/admin`)**: Grafik pendapatan, kunjungan pasien, layanan terpopuler (ApexCharts), peringatan stok FEFO, dan Audit Log.
- **Manajemen Appointment & Jadwal Operasional (`/admin/appointments`)**: Tab terpisah antara daftar appointment pasien dan pengaturan jadwal klinik (jam reguler Senin–Sabtu, interval slot `30`/`60` menit, preset cepat sesi pagi/siang, libur khusus, dan pengurangan jam praktik).
- **Jadwal Praktik & Hari Libur Dokter (`/admin/schedules`)**: Pengaturan jadwal mingguan per dokter dan tanggal libur khusus.
- **Verifikasi Invoice & Penyerahan Obat FEFO (`/admin/payments`)**: Penerbitan invoice dari *treatment record* SOAP dokter, pemotongan stok obat metode **FEFO (First Expired, First Out)**, dan verifikasi pelunasan tanpa eksposur edit/hapus destruktif pada invoice.
- **Master Data, Inventori, Laporan & Pengaturan**: Manajemen terpusat melalui `/admin/patients`, `/admin/doctors`, `/admin/services`, `/admin/inventory`, `/admin/reports` (ekspor CSV), dan `/admin/settings`.

---

## 2. Aturan Bisnis Klinis & Otomasi

### Odontogram FDI Otomatis Berbasis Usia (`app/utils/odontogramAgeRules.ts`)

| Kelompok Usia | Mode | Gigi yang Ditampilkan |
| :--- | :--- | :--- |
| **0–5 Tahun** | `PRIMARY` | 20 gigi susu (`51–85`), gigi permanen disembunyikan |
| **6–12 Tahun** | `MIXED` | Seluruh 52 gigi (20 gigi susu + 32 gigi permanen) untuk masa pergantian gigi |
| **≥ 13 Tahun** | `PERMANENT` | 32 gigi permanen (`11–48`), gigi susu disembunyikan |

- **Aturan Gigi Bungsu (`18`, `28`, `38`, `48`)**:
  - Usia `< 17 tahun`: otomatis bertanda `Belum Erupsi`.
  - Usia `17–25 tahun`: mendukung status `Erupsi Normal`, `Impaksi`, `Sebagian Erupsi`, dan `Belum Erupsi`.
  - Usia `> 25 tahun`: mendukung status `Ada`, `Tidak Ada`, `Impaksi`, dan `Telah Dicabut`.

### Kalender & Jadwal Praktik (`app/utils/clinicScheduleRules.ts`)
- **Hari Minggu**: Otomatis berstatus `Libur` dan tidak dapat dipilih pasien.
- **Tanggal Merah Nasional Indonesia**: Otomatis ditandai merah sebagai `Libur` beserta keterangan nama hari libur nasional.
- **Hari Biasa Fleksibel (Senin–Sabtu)**: Admin dapat menetapkan tanggal libur khusus (`Klinik Tutup`) atau pengurangan jam praktik (`Jam Praktek Terbatas`), yang otomatis membatasi slot waktu di server maupun UI booking.

### Inventori Obat FEFO
- Pemotongan stok otomatis memilih *batch* aktif dengan tanggal kedaluwarsa paling dekat (*First Expired, First Out*) dan menolak obat yang sudah kedaluwarsa.

---

## 3. Teknologi yang Digunakan

| Kategori | Stack & Library |
| :--- | :--- |
| **Frontend** | Nuxt 4, Vue 3, TypeScript, Tailwind CSS, Nuxt UI, Pinia, VueUse, ApexCharts |
| **Backend & API** | Nuxt Server Engine (Nitro + H3), Zod Validation, Scrypt Password Hashing |
| **Database & ORM** | Prisma ORM v6 (`mysql` provider) — MySQL / TiDB Cloud |
| **Testing** | Vitest (Unit & Integration), Playwright (End-to-End) |

---

## 4. Struktur Proyek

```text
├── app/
│   ├── components/
│   │   ├── booking/          # Kalender booking interaktif (libur & jam terbatas)
│   │   ├── landing/          # Komponen halaman utama & kartu ulasan bintang
│   │   └── odontogram/       # Peta odontogram FDI interaktif berbasis usia
│   ├── layouts/              # Layout publik & portal terautentikasi
│   ├── pages/                # Halaman publik, patient, doctor, receptionist, admin
│   └── utils/                # Helper format, aturan odontogram usia, aturan jadwal klinik
├── prisma/
│   ├── schema.prisma         # Skema database MySQL/TiDB lengkap
│   └── seed.ts               # Data awal dokter, layanan, pasien, obat, artikel, ulasan
├── public/
│   ├── figma/                # Aset ikon SVG sistem desain
│   └── images/               # Foto klinis lokal halaman publik
├── server/
│   ├── api/                  # REST API endpoint (auth, appointments, clinic-schedule, dll.)
│   ├── services/             # Appointment verification, FEFO, payment gateway adapter
│   └── utils/                # Prisma client, session, crypto, audit log
└── tests/
    ├── integration/          # Pengujian alur API & keamanan
    └── unit/                 # Pengujian logika bisnis (FEFO, FDI, jadwal, kripto)
```

---

## 5. Panduan Instalasi & Menjalankan Lokal

### Prasyarat
- **Node.js v22+** dan **npm**
- **MySQL** atau **TiDB Cloud**

### Langkah Instalasi

1. **Salin file environment variable:**
   ```bash
   cp .env.example .env
   ```

2. **Konfigurasi koneksi database dan secret di `.env`:**
   ```env
   DATABASE_URL="mysql://USERNAME:PASSWORD@HOST:4000/DATABASE_NAME?sslaccept=strict"
   SESSION_SECRET="ganti-dengan-secret-acak-minimal-32-karakter-untuk-produksi"
   NUXT_PUBLIC_APP_URL="http://localhost:3000"
   PAYMENT_GATEWAY_PROVIDER="mock"
   PAYMENT_WEBHOOK_SECRET="lumina-webhook-secret"
   ```

3. **Pasang seluruh dependensi proyek:**
   ```bash
   npm install
   ```

4. **Generate Prisma Client & jalankan migrasi database:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate:deploy
   ```

5. **Jalankan seed data demonstrasi *(opsional untuk development)*:**
   ```bash
   npm run prisma:seed
   ```

6. **Jalankan server development:**
   ```bash
   npm run dev
   ```
   Akses aplikasi melalui `http://localhost:3000`.

---

## 6. Akun Demo Development

Akun demonstrasi otomatis dibuat saat menjalankan `prisma/seed.ts`:

| Role | Email | Password | Portal Tujuan |
| :--- | :--- | :--- | :--- |
| **Administrator (Gmail Resmi)** | `dentalcarelumina@gmail.com` | `123dentalcarelumina` | `/admin` |
| **Administrator** | `admin@luminadental.id` | `Lumina123!` | `/admin` |
| **Dokter Gigi** | `drg.amanda@luminadental.id` | `Lumina123!` | `/doctor` |
| **Resepsionis** | `resepsionis@luminadental.id` | `Lumina123!` | `/receptionist` |
| **Pasien** | `budi.santoso@email.id` | `Lumina123!` | `/patient` |

> [!WARNING]
> Akun di atas hanya untuk kebutuhan *development* dan demonstrasi lokal. Pastikan mengganti seluruh kredensial serta `SESSION_SECRET` sebelum *deployment* ke lingkungan produksi.

---

## 7. Pengujian & Verifikasi

| Jenis Pengujian | Perintah |
| :--- | :--- |
| **Unit & Integration Tests (Vitest)** | `npm test` |
| **Typecheck Nuxt & TypeScript** | `npm run typecheck` |
| **Validasi Skema Prisma** | `npm run prisma:validate` |
| **End-to-End Tests (Playwright)** | `npm run test:e2e` |

---

## 8. Catatan Layanan Eksternal

- **TiDB Cloud / MySQL**: Wajib dikonfigurasi melalui `DATABASE_URL` di file `.env`.
- **Gmail SMTP (Reset Password)**: Menggunakan `smtp.gmail.com:465` (TLS). Atur `GMAIL_USER` dan `GMAIL_APP_PASSWORD` di `.env` atau langsung melalui **Admin Dashboard → Pengaturan Sistem (`/admin/settings`)**.
- **Payment Gateway**: Secara default menggunakan `MockPaymentGatewayAdapter` (`PAYMENT_GATEWAY_PROVIDER="mock"`) untuk simulasi *development*. Untuk produksi, implementasikan interface `PaymentGatewayAdapter` di `server/services/paymentGatewayService.ts` bersama `PAYMENT_GATEWAY_SERVER_KEY` dan `PAYMENT_WEBHOOK_SECRET`.

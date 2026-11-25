# Dokumentasi API Backend Lumina Dental Care

Seluruh endpoint berada di bawah prefix `/api` dan menerapkan validasi skema menggunakan **Zod** serta pemeriksaan hak akses **RBAC Server-Side** (`requireAuth` / `requireRole`).

## 1. Authentication (`/api/auth/*`)
| Method | Endpoint | Hak Akses | Deskripsi |
|---|---|---|---|
| `POST` | `/api/auth/register` | Publik | Registrasi mandiri pasien baru + pencegahan duplikasi + pembuatan sesi HTTP-only cookie |
| `POST` | `/api/auth/login` | Publik | Login pengguna dengan rate limiting & verifikasi password scrypt |
| `POST` | `/api/auth/logout` | Autentikasi | Menghapus sesi dari database dan menghapus cookie `lumina_session` |
| `GET` | `/api/auth/me` | Publik/Sesi | Mengambil profil pengguna yang sedang login beserta `role`, `patientId`, `doctorId` |
| `POST` | `/api/auth/forgot-password` | Publik | Membuat token reset kata sandi dengan masa berlaku 30 menit |
| `POST` | `/api/auth/reset-password` | Publik | Mengatur ulang kata sandi menggunakan token valid dan mencabut sesi lama |
| `POST` | `/api/auth/verify-email` | Publik/Sesi | Memverifikasi akun pengguna |
| `POST` | `/api/auth/change-password` | Autentikasi | Mengubah kata sandi pengguna aktif |

## 2. Patients (`/api/patients/*`)
| Method | Endpoint | Hak Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/patients` | `PATIENT` (milik sendiri), `RECEPTIONIST`, `DOCTOR`, `ADMIN` | Daftar & pencarian pasien dengan filter dan pagination |
| `POST` | `/api/patients` | `RECEPTIONIST`, `ADMIN` | Pendaftaran pasien baru dengan pencegahan duplikasi NIK/telepon/email |
| `GET` | `/api/patients/:id` | `PATIENT` (milik sendiri), `RECEPTIONIST`, `DOCTOR`, `ADMIN` | Detail pasien (rekam medis klinis dibatasi hanya untuk `PATIENT` pemilik, `DOCTOR`, dan `ADMIN`) |
| `PATCH` | `/api/patients/:id` | `PATIENT` (milik sendiri), `RECEPTIONIST`, `ADMIN` | Pembaruan data pasien |
| `DELETE` | `/api/patients/:id` | `ADMIN` | Menghapus data pasien yang belum memiliki riwayat rekam medis/transaksi |

## 3. Doctors, Services & Schedules
| Method | Endpoint | Hak Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/doctors` | Publik | Daftar dokter gigi beserta jadwal praktik |
| `POST` | `/api/doctors` | `ADMIN` | Menambah dokter gigi baru beserta akun user dan jadwal default |
| `PATCH` | `/api/doctors/:id` | `ADMIN` | Memperbarui profil dan status aktif dokter |
| `DELETE` | `/api/doctors/:id` | `ADMIN` | Menonaktifkan dokter |
| `GET` | `/api/services` | Publik | Daftar layanan perawatan gigi dan tarif IDR |
| `POST` | `/api/services` | `ADMIN` | Menambah layanan perawatan gigi baru |
| `PATCH` | `/api/services/:id` | `ADMIN` | Memperbarui harga, durasi, dan status layanan |
| `DELETE` | `/api/services/:id` | `ADMIN` | Menonaktifkan layanan |
| `GET` | `/api/schedules` | Publik | Daftar jadwal praktik dokter dan hari libur klinik |
| `POST` | `/api/schedules` | `ADMIN` | Menyimpan jadwal praktik dokter atau hari libur klinik |
| `DELETE` | `/api/schedules/:id` | `ADMIN` | Menghapus jadwal praktik atau hari libur |
| `GET` | `/api/schedules/availability` | Publik/Autentikasi | Menghitung slot waktu tersedia untuk dokter, layanan, dan tanggal tertentu |

## 4. Appointments & Queues
| Method | Endpoint | Hak Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/appointments` | `PATIENT` (milik sendiri), `DOCTOR`, `RECEPTIONIST`, `ADMIN` | Daftar appointment sesuai kewenangan role |
| `POST` | `/api/appointments` | `PATIENT`, `RECEPTIONIST`, `ADMIN` | Membuat appointment baru melalui **Appointment Verification System** (otomatis `CONFIRMED` & anti double booking) |
| `GET` | `/api/appointments/:id` | `PATIENT` (milik sendiri), `DOCTOR`, `RECEPTIONIST`, `ADMIN` | Detail appointment |
| `PATCH` | `/api/appointments/:id` | `RECEPTIONIST`, `DOCTOR`, `ADMIN` | Mengubah jadwal (reschedule) atau status appointment |
| `POST` | `/api/appointments/:id/cancel` | `PATIENT` (milik sendiri), `RECEPTIONIST`, `ADMIN` | Membatalkan appointment dan membebaskan `slotKey` |
| `GET` | `/api/queues` | `RECEPTIONIST`, `DOCTOR`, `ADMIN` | Daftar antrean harian klinik |
| `POST` | `/api/queues/checkin` | `RECEPTIONIST`, `ADMIN` | Check-in pasien dan menerbitkan nomor antrean berurutan (`A-001`, dst.) |
| `PATCH` | `/api/queues/:id` | `RECEPTIONIST`, `DOCTOR`, `ADMIN` | Mengubah status antrean (`WAITING`, `CALLED`, `IN_PROGRESS`, `COMPLETED`) |

## 5. Medical Records, Odontograms & Prescriptions
| Method | Endpoint | Hak Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/medical-records` | `PATIENT` (milik sendiri), `DOCTOR`, `ADMIN` | Daftar rekam medis, diagnosis, tindakan, dan resep |
| `POST` | `/api/medical-records` | `DOCTOR`, `ADMIN` | Menyimpan rekam medis SOAP, diagnosis, tindakan, odontogram, memotong stok resep secara FEFO, dan menerbitkan invoice otomatis |
| `GET` | `/api/medical-records/:id` | `PATIENT` (milik sendiri), `DOCTOR`, `ADMIN` | Detail rekam medis |
| `PATCH` | `/api/medical-records/:id` | `DOCTOR` (pemeriksa), `ADMIN` | Revisi rekam medis berotorisasi dengan pencatatan `revisionNumber` & `changeHistoryJson` |
| `GET` | `/api/odontograms` | `PATIENT` (milik sendiri), `DOCTOR`, `ADMIN` | Peta kondisi 52 gigi FDI terbaru dan riwayat pemeriksaan gigi |
| `POST` | `/api/odontograms` | `DOCTOR`, `ADMIN` | Mencatat kondisi gigi FDI, permukaan (`M,O,D,B,L`), diagnosis, tindakan, dan catatan dokter |
| `GET` | `/api/prescriptions` | `PATIENT` (milik sendiri), `DOCTOR`, `ADMIN` | Daftar resep obat |
| `POST` | `/api/prescriptions` | `DOCTOR`, `ADMIN` | Membuat resep obat dan memotong stok batch secara FEFO |

## 6. Medicines & Inventory Ledger (FEFO)
| Method | Endpoint | Hak Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/medicines` | `DOCTOR`, `RECEPTIONIST`, `ADMIN` | Katalog obat aktif beserta stok tersedia |
| `POST` | `/api/medicines` | `ADMIN` | Menambah master data obat baru |
| `PATCH` | `/api/medicines/:id` | `ADMIN` | Memperbarui master data obat |
| `GET` | `/api/inventory` | `DOCTOR`, `ADMIN` | Dashboard stok obat, daftar batch FEFO, peringatan stok rendah, dan peringatan kedaluwarsa |
| `POST` | `/api/inventory/stock-in` | `ADMIN` | Mencatat stok masuk beserta nomor batch dan tanggal kedaluwarsa ke Inventory Ledger |
| `POST` | `/api/inventory/stock-out` | `DOCTOR`, `ADMIN` | Mengeluarkan stok obat secara otomatis dengan prinsip **FEFO** |
| `POST` | `/api/inventory/adjustment` | `ADMIN` | Penyesuaian stok fisik (stock opname) dengan validasi anti-stok negatif |
| `GET` | `/api/inventory/transactions` | `DOCTOR`, `ADMIN` | Riwayat lengkap buku besar mutasi stok (`InventoryTransaction`) |

## 7. Invoices, Payments & Reports
| Method | Endpoint | Hak Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/invoices` | `PATIENT` (milik sendiri), `RECEPTIONIST`, `ADMIN` | Daftar tagihan dan status pembayaran |
| `POST` | `/api/invoices` | `RECEPTIONIST`, `ADMIN` | Menerbitkan tagihan baru |
| `POST` | `/api/payments/manual` | `RECEPTIONIST`, `ADMIN` | Verifikasi pembayaran manual di klinik dan penerbitan kwitansi lunas |
| `POST` | `/api/payments/online` | `PATIENT`, `RECEPTIONIST`, `ADMIN` | Pembayaran online dengan idempotency key & penanda simulasi development pada mode mock |
| `POST` | `/api/payments/webhook` | Payment Gateway | Endpoint webhook dengan verifikasi signature HMAC-SHA256 dan idempotency `PaymentGatewayEvent` |
| `GET` | `/api/reports/overview` | `ADMIN` | KPI Dashboard Admin, seri grafik ApexCharts, peringatan inventaris, dan Audit Log |
| `GET` | `/api/reports/revenue` | `ADMIN` | Laporan pendapatan per periode |
| `GET` | `/api/reports/appointments` | `ADMIN` | Laporan kunjungan dan appointment |
| `GET` | `/api/reports/patients` | `ADMIN` | Laporan rekapitulasi pasien |
| `GET` | `/api/reports/inventory` | `ADMIN` | Laporan persediaan obat dan mutasi stok |

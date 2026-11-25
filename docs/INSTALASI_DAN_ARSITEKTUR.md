# Dokumentasi Struktur Aplikasi & Arsitektur Lumina Dental Care

## 1. Struktur Folder Modular (Nuxt 4)

```text
projek_Bootcamp_tmt/
├── app/
│   ├── assets/css/main.css              # Design System Tailwind CSS & Nuxt UI
│   ├── components/
│   │   ├── appointment/                 # AppointmentCard, CalendarWidget
│   │   ├── common/                      # Navbar, Footer, StatusBadge, ConfirmDialog, EmptyState, LoadingSkeleton, ErrorState, SearchInput, FilterDropdown, FormField, NotificationCard
│   │   ├── dashboard/                   # DashboardCard, RevenueChart (ApexCharts)
│   │   ├── landing/                     # HeroSection, StatisticCard, FeatureCard, DoctorCard, ReviewCard
│   │   ├── odontogram/                  # FdiOdontogramChart (52 Gigi FDI Permanen & Susu)
│   │   └── patient/                     # ProfileCard
│   ├── composables/
│   │   └── useClinicToast.ts            # State notifikasi toast global
│   ├── layouts/
│   │   ├── default.vue                  # Layout Website Publik
│   │   └── portal.vue                   # Layout Responsif Patient, Doctor, Receptionist & Admin Portal
│   ├── middleware/
│   │   └── auth.global.ts               # Proteksi Route & RBAC di sisi client/SSR
│   ├── pages/
│   │   ├── index.vue                    # Beranda Publik
│   │   ├── about/index.vue              # Profil, Visi Misi & Fasilitas Klinik
│   │   ├── services/index.vue           # Katalog Layanan & Tarif IDR
│   │   ├── doctors/index.vue            # Daftar Dokter & Jadwal Praktik
│   │   ├── articles/                    # Daftar & Detail Artikel Kesehatan Gigi
│   │   ├── reviews/index.vue            # Testimoni & Form Ulasan Pasien
│   │   ├── contact/index.vue            # Kontak, Jam Operasional & Peta Lokasi
│   │   ├── auth/                        # Login, Register, Forgot/Reset Password, Verify
│   │   ├── patient/                     # Patient Portal (Dashboard, Booking 7 Langkah, Medical History, Payments, Profile)
│   │   ├── doctor/                      # Doctor Portal (Dashboard, Appointments, Medical Records SOAP+Resep, Odontogram FDI)
│   │   ├── receptionist/                # Receptionist Portal (Dashboard, Patients, Appointments, Queues, Manual Payment Verification)
│   │   └── admin/                       # Admin Dashboard (Overview ApexCharts, Patients, Doctors, Services, Schedules, Inventory FEFO, Payments, Reports, Settings/RBAC)
│   ├── plugins/
│   │   └── apexcharts.client.ts         # Registrasi komponen grafik ApexCharts
│   ├── stores/
│   │   └── auth.ts                      # Pinia Store Autentikasi & Sesi
│   ├── types/
│   │   └── index.ts                     # Definisi Tipe TypeScript
│   └── utils/
│       └── format.ts                    # Formatter Rupiah IDR, Tanggal Indonesia, & Metadata Odontogram
├── server/
│   ├── api/                             # Endpoint Nuxt Server API berbasis modul
│   ├── middleware/
│   │   └── auth.ts                      # Security Headers & Hidrasi Sesi Server
│   ├── services/
│   │   ├── appointmentVerificationService.ts # Verifikasi Otomatis 8 Kriteria Appointment & Anti Double Booking
│   │   ├── inventoryLedgerService.ts         # Algoritma FEFO, Stock In/Out, Pencegahan Stok Negatif & Obat Kedaluwarsa
│   │   └── paymentGatewayService.ts          # Adapter Pattern Payment Gateway & Verifikasi Signature Webhook
│   └── utils/
│       ├── prisma.ts                    # Singleton PrismaClient TiDB Cloud
│       ├── crypto.ts                    # Scrypt Password Hashing, Token SHA-256, HMAC Webhook
│       ├── session.ts                   # HTTP-Only Cookie Session & Server-Side RBAC (requireAuth, requireRole)
│       ├── rateLimit.ts                 # Rate Limiter Endpoint Sensitif
│       ├── audit.ts                     # Pencatatan Jejak Audit Log
│       └── fdiTeeth.ts                  # Katalog 52 Gigi Standar FDI
├── prisma/
│   ├── schema.prisma                    # Skema 27+ Entitas Database TiDB Cloud (provider = "mysql")
│   ├── seed.ts                          # Seed Data Demonstrasi Development
│   └── migrations/                      # SQL Migration Kompatibel TiDB Cloud / MySQL 8.0
└── tests/
    ├── unit/                            # Unit Testing Logika Bisnis, Kriptografi, FEFO, & FDI
    ├── integration/                     # Integration Testing Keamanan & Rate Limit
    └── e2e/                             # End-to-End Testing Playwright
```

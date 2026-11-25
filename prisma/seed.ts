import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../server/utils/crypto'
import { FDI_TEETH_CATALOG } from '../server/utils/fdiTeeth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Memulai proses seed database Lumina Dental Care (Data Demonstrasi Development)...')

  // 1. Roles
  const roleDefinitions = [
    { code: 'VISITOR' as const, name: 'Pengunjung Publik', description: 'Pengunjung website publik' },
    { code: 'PATIENT' as const, name: 'Pasien', description: 'Pasien terdaftar klinik gigi' },
    { code: 'DOCTOR' as const, name: 'Dokter Gigi', description: 'Tenaga medis dokter gigi' },
    { code: 'RECEPTIONIST' as const, name: 'Resepsionis', description: 'Petugas pendaftaran, antrean, dan kasir' },
    { code: 'ADMIN' as const, name: 'Administrator', description: 'Pengelola penuh sistem klinik' }
  ]

  const rolesMap: Record<string, string> = {}
  for (const r of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: r
    })
    rolesMap[r.code] = role.id
  }

  // 2. Pengaturan Klinik
  const existingSetting = await prisma.clinicSetting.findFirst()
  const operatingHours = {
    '0': { dayName: 'Minggu', isOpen: false, open: '09:00', close: '15:00' },
    '1': { dayName: 'Senin', isOpen: true, open: '08:00', close: '20:00' },
    '2': { dayName: 'Selasa', isOpen: true, open: '08:00', close: '20:00' },
    '3': { dayName: 'Rabu', isOpen: true, open: '08:00', close: '20:00' },
    '4': { dayName: 'Kamis', isOpen: true, open: '08:00', close: '20:00' },
    '5': { dayName: 'Jumat', isOpen: true, open: '08:00', close: '20:00' },
    '6': { dayName: 'Sabtu', isOpen: true, open: '08:00', close: '17:00' }
  }

  if (!existingSetting) {
    await prisma.clinicSetting.create({
      data: {
        clinicName: 'Lumina Dental Care',
        tagline: 'Senyum Cerah Dimulai Dari Perawatan Terbaik',
        address: 'Jl. Jenderal Ahmad Yani No. 128, Pontianak Selatan, Kota Pontianak, Kalimantan Barat 78121',
        phone: '(0561) 738900',
        whatsapp: '08115678900',
        email: 'dentalcarelumina@gmail.com',
        operatingHoursJson: operatingHours,
        mapEmbedUrl: 'https://www.openstreetmap.org/export/embed.html?bbox=109.32%2C-0.05%2C109.36%2C-0.02&layer=mapnik',
        notificationConfig: {
          emailReminder: true,
          whatsappReminder: true,
          lowStockAlert: true,
          expiryDaysThreshold: 60,
          gmailUser: 'dentalcarelumina@gmail.com',
          gmailAppPassword: '123dentalcarelumina'
        }
      }
    })
  } else {
    await prisma.clinicSetting.update({
      where: { id: existingSetting.id },
      data: {
        email: 'dentalcarelumina@gmail.com',
        notificationConfig: {
          emailReminder: true,
          whatsappReminder: true,
          lowStockAlert: true,
          expiryDaysThreshold: 60,
          gmailUser: 'dentalcarelumina@gmail.com',
          gmailAppPassword: '123dentalcarelumina'
        }
      }
    })
  }

  // 3. Katalog Gigi FDI (32 Permanen + 20 Susu = 52 Gigi)
  for (const tooth of FDI_TEETH_CATALOG) {
    await prisma.tooth.upsert({
      where: { fdiNumber: tooth.fdiNumber },
      update: {
        quadrant: tooth.quadrant,
        position: tooth.position,
        toothType: tooth.toothType,
        nameId: tooth.nameId,
        arch: tooth.arch,
        side: tooth.side
      },
      create: tooth
    })
  }

  // 4. Akun Pengguna Default (Password: Lumina123!)
  const defaultPass = hashPassword('Lumina123!')

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@luminadental.id' },
    update: { fullName: 'Nadya Pratama (Admin)', roleId: rolesMap.ADMIN! },
    create: {
      roleId: rolesMap.ADMIN!,
      fullName: 'Nadya Pratama (Admin)',
      email: 'admin@luminadental.id',
      phone: '081256000001',
      passwordHash: defaultPass,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    }
  })

  // Akun Gmail Resmi Klinik (dentalcarelumina@gmail.com)
  const gmailClinicPass = hashPassword('123dentalcarelumina')
  await prisma.user.upsert({
    where: { email: 'dentalcarelumina@gmail.com' },
    update: {
      fullName: 'Lumina Dental Care (Gmail Resmi)',
      roleId: rolesMap.ADMIN!,
      passwordHash: gmailClinicPass,
      isActive: true,
      isEmailVerified: true
    },
    create: {
      roleId: rolesMap.ADMIN!,
      fullName: 'Lumina Dental Care (Gmail Resmi)',
      email: 'dentalcarelumina@gmail.com',
      phone: '08115678900',
      passwordHash: gmailClinicPass,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    }
  })

  await prisma.user.upsert({
    where: { email: 'resepsionis@luminadental.id' },
    update: { fullName: 'Siti Rahmawati', roleId: rolesMap.RECEPTIONIST! },
    create: {
      roleId: rolesMap.RECEPTIONIST!,
      fullName: 'Siti Rahmawati',
      email: 'resepsionis@luminadental.id',
      phone: '081256000002',
      passwordHash: defaultPass,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    }
  })

  // 5. Dokter Gigi & Jadwal Praktik
  const doctorsSeed = [
    {
      email: 'drg.amanda@luminadental.id',
      fullName: 'Amanda Wijaya',
      titlePrefix: 'drg.',
      titleSuffix: 'Sp.KG',
      licenseNumber: 'SIP-DRG-7812-001',
      specialization: 'Konservasi Gigi & Endodontik',
      experienceYears: 9,
      education: 'Fakultas Kedokteran Gigi Universitas Indonesia',
      consultationFee: 200000,
      isFeatured: true,
      bio: 'Spesialis konservasi gigi yang berfokus pada perawatan saluran akar tanpa nyeri, restorasi estetik, dan pelestarian struktur gigi alami.',
      photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80'
    },
    {
      email: 'drg.reynaldi@luminadental.id',
      fullName: 'Reynaldi Santoso',
      titlePrefix: 'drg.',
      titleSuffix: 'Sp.Ort',
      licenseNumber: 'SIP-DRG-7812-002',
      specialization: 'Ortodonti & Estetika Senyum',
      experienceYears: 11,
      education: 'Fakultas Kedokteran Gigi Universitas Gadjah Mada',
      consultationFee: 250000,
      isFeatured: true,
      bio: 'Ahli ortodonti berpengalaman dalam koreksi susunan gigi dengan behel modern maupun clear aligner untuk proporsi wajah harmonis.',
      photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80'
    },
    {
      email: 'drg.clara@luminadental.id',
      fullName: 'Clara Kusuma',
      titlePrefix: 'drg.',
      titleSuffix: 'Sp.KGA',
      licenseNumber: 'SIP-DRG-7812-003',
      specialization: 'Kedokteran Gigi Anak (Pedodonsia)',
      experienceYears: 7,
      education: 'Fakultas Kedokteran Gigi Universitas Airlangga',
      consultationFee: 180000,
      isFeatured: true,
      bio: 'Pendekatan ramah anak untuk pencegahan karies dini, aplikasi topikalisasi fluoride, dan edukasi kesehatan gigi keluarga.',
      photoUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=600&q=80'
    },
    {
      email: 'drg.hendra@luminadental.id',
      fullName: 'Hendra Gunawan',
      titlePrefix: 'drg.',
      titleSuffix: 'Sp.BM',
      licenseNumber: 'SIP-DRG-7812-004',
      specialization: 'Bedah Mulut & Implan Gigi',
      experienceYears: 12,
      education: 'Fakultas Kedokteran Gigi Universitas Padjadjaran',
      consultationFee: 250000,
      isFeatured: false,
      bio: 'Spesialis bedah mulut minor, odontektomi gigi bungsu impaksi, dan pemasangan implan gigi presisi.',
      photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=600&q=80'
    }
  ]

  const createdDoctors = []
  for (const doc of doctorsSeed) {
    const docUser = await prisma.user.upsert({
      where: { email: doc.email },
      update: { fullName: `${doc.titlePrefix} ${doc.fullName}, ${doc.titleSuffix}`, roleId: rolesMap.DOCTOR! },
      create: {
        roleId: rolesMap.DOCTOR!,
        fullName: `${doc.titlePrefix} ${doc.fullName}, ${doc.titleSuffix}`,
        email: doc.email,
        phone: '081256000100',
        passwordHash: defaultPass,
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date()
      }
    })

    const doctorRecord = await prisma.doctor.upsert({
      where: { userId: docUser.id },
      update: {
        licenseNumber: doc.licenseNumber,
        titlePrefix: doc.titlePrefix,
        fullName: doc.fullName,
        titleSuffix: doc.titleSuffix,
        specialization: doc.specialization,
        bio: doc.bio,
        experienceYears: doc.experienceYears,
        education: doc.education,
        consultationFee: doc.consultationFee,
        photoUrl: doc.photoUrl,
        isFeatured: doc.isFeatured,
        isActive: true
      },
      create: {
        userId: docUser.id,
        licenseNumber: doc.licenseNumber,
        titlePrefix: doc.titlePrefix,
        fullName: doc.fullName,
        titleSuffix: doc.titleSuffix,
        specialization: doc.specialization,
        bio: doc.bio,
        experienceYears: doc.experienceYears,
        education: doc.education,
        consultationFee: doc.consultationFee,
        photoUrl: doc.photoUrl,
        isFeatured: doc.isFeatured,
        isActive: true
      }
    })
    createdDoctors.push(doctorRecord)

    // Buat jadwal praktik Senin (1) s/d Sabtu (6)
    for (let day = 1; day <= 6; day++) {
      await prisma.schedule.upsert({
        where: {
          doctorId_dayOfWeek_startTime: {
            doctorId: doctorRecord.id,
            dayOfWeek: day,
            startTime: '09:00'
          }
        },
        update: {
          endTime: day === 6 ? '15:00' : '17:00',
          slotDurationMin: 30,
          maxPatients: 12,
          isActive: true
        },
        create: {
          doctorId: doctorRecord.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: day === 6 ? '15:00' : '17:00',
          slotDurationMin: 30,
          maxPatients: 12,
          isActive: true
        }
      })
    }
  }

  // 6. Layanan Klinik Gigi
  const servicesSeed = [
    {
      code: 'SRV-SCALING',
      slug: 'scaling-dan-polishing-ultrasonik',
      name: 'Scaling & Polishing Ultrasonik',
      category: 'Pencegahan & Pembersihan',
      shortDesc: 'Pembersihan karang gigi menyeluruh dengan teknologi ultrasonik lembut dan pemolesan enamel.',
      description: 'Prosedur pembersihan plak dan kalkulus (karang gigi) supra maupun subgingiva menggunakan ultrasonic scaler modern untuk mencegah gingivitis dan periodontitis, diakhiri dengan pemolesan gigi.',
      price: 350000,
      durationMinutes: 45,
      iconName: 'i-lucide-sparkles',
      isFeatured: true
    },
    {
      code: 'SRV-COMPOSITE',
      slug: 'tambal-gigi-estetik-komposit',
      name: 'Tambal Gigi Estetik (Resin Komposit)',
      category: 'Konservasi Gigi',
      shortDesc: 'Restorasi gigi berlubang dengan bahan komposit sewarna gigi alami yang kuat dan presisi.',
      description: 'Penambalan karies atau patah gigi menggunakan resin komposit nano-hybrid dengan pencocokan warna gigi alami sehingga hasil tambalan tampak menyatu dan tahan terhadap beban kunyah.',
      price: 450000,
      durationMinutes: 45,
      iconName: 'i-lucide-shield-check',
      isFeatured: true
    },
    {
      code: 'SRV-BLEACHING',
      slug: 'teeth-whitening-lumina-bright',
      name: 'Teeth Whitening (Bleaching In-Office)',
      category: 'Estetika Gigi',
      shortDesc: 'Pemutihan gigi klinis dalam satu kali kunjungan untuk senyum lebih cerah hingga beberapa tingkat.',
      description: 'Perawatan pemutihan gigi profesional di klinik dengan gel hidrogen peroksida teraktivasi cahaya dingin yang aman bagi lapisan email dan meminimalkan rasa ngilu.',
      price: 1850000,
      durationMinutes: 60,
      iconName: 'i-lucide-sun',
      isFeatured: true
    },
    {
      code: 'SRV-RCT',
      slug: 'perawatan-saluran-akar-endodontik',
      name: 'Perawatan Saluran Akar (Endodontik)',
      category: 'Konservasi Gigi',
      shortDesc: 'Penyelamatan gigi terinfeksi parah tanpa cabut melalui pembersihan saluran akar.',
      description: 'Prosedur endodontik menggunakan rotary instrument dan apex locator digital untuk membersihkan jaringan pulpa yang terinfeksi, mensterilkan saluran akar, serta menutupnya secara rapat.',
      price: 1200000,
      durationMinutes: 60,
      iconName: 'i-lucide-heart-pulse',
      isFeatured: true
    },
    {
      code: 'SRV-ORTHO',
      slug: 'pemasangan-behel-ortodonti-metal-ceramic',
      name: 'Konsultasi & Pemasangan Ortodonti (Behel)',
      category: 'Ortodonti',
      shortDesc: 'Perawatan merapikan susunan gigi dan rahang untuk fungsi kunyah optimal dan estetika wajah.',
      description: 'Analisis sefalometri, pencetakan gigi digital, dan pemasangan bracket ortodonti oleh Dokter Gigi Spesialis Ortodonti.',
      price: 4500000,
      durationMinutes: 60,
      iconName: 'i-lucide-smile',
      isFeatured: true
    },
    {
      code: 'SRV-KIDS',
      slug: 'perawatan-gigi-anak-dan-topikal-fluoride',
      name: 'Pemeriksaan Gigi Anak & Topikal Fluoride',
      category: 'Kedokteran Gigi Anak',
      shortDesc: 'Perlindungan ekstra email gigi anak dari risiko karies dengan pendekatan menyenangkan.',
      description: 'Pemeriksaan menyeluruh tumbuh kembang gigi anak disertai pengolesan fluoride varnish untuk memperkuat mineral gigi susu maupun permanen muda.',
      price: 300000,
      durationMinutes: 30,
      iconName: 'i-lucide-baby',
      isFeatured: true
    },
    {
      code: 'SRV-EXTRACTION',
      slug: 'pencabutan-gigi-dan-odontektomi',
      name: 'Pencabutan Gigi & Bedah Gigi Bungsu',
      category: 'Bedah Mulut',
      shortDesc: 'Tindakan pencabutan gigi dengan anestesi lokal terukur yang minim trauma jaringan.',
      description: 'Prosedur ekstraksi gigi atau operasi gigi bungsu impaksi (odontektomi) dengan protokol sterilisasi ketat dan manajemen nyeri pascatindakan.',
      price: 950000,
      durationMinutes: 60,
      iconName: 'i-lucide-activity',
      isFeatured: false
    },
    {
      code: 'SRV-VENEER',
      slug: 'direct-dan-porcelain-veneer',
      name: 'Veneer Gigi Porselen Premium',
      category: 'Estetika Gigi',
      shortDesc: 'Lapisan porselen tipis presisi untuk mengoreksi bentuk, celah, dan warna gigi depan.',
      description: 'Desain senyum digital (Digital Smile Design) dengan lapisan porselen ultra-tipis untuk tampilan gigi depan yang proporsional dan natural.',
      price: 2750000,
      durationMinutes: 60,
      iconName: 'i-lucide-gem',
      isFeatured: false
    }
  ]

  const createdServices = []
  for (const srv of servicesSeed) {
    const s = await prisma.service.upsert({
      where: { code: srv.code },
      update: srv,
      create: srv
    })
    createdServices.push(s)
  }

  // 7. Pasien Demo
  const patientUser = await prisma.user.upsert({
    where: { email: 'budi.santoso@email.id' },
    update: { fullName: 'Budi Santoso', roleId: rolesMap.PATIENT! },
    create: {
      roleId: rolesMap.PATIENT!,
      fullName: 'Budi Santoso',
      email: 'budi.santoso@email.id',
      phone: '081345678901',
      passwordHash: defaultPass,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    }
  })

  const patient1 = await prisma.patient.upsert({
    where: { medicalRecordNo: 'RM-2026-0001' },
    update: { userId: patientUser.id, fullName: 'Budi Santoso', phone: '081345678901' },
    create: {
      userId: patientUser.id,
      medicalRecordNo: 'RM-2026-0001',
      nik: '6171011205920001',
      fullName: 'Budi Santoso',
      email: 'budi.santoso@email.id',
      phone: '081345678901',
      dateOfBirth: new Date('1992-05-12T00:00:00.000Z'),
      gender: 'LAKI_LAKI',
      bloodType: 'O',
      address: 'Jl. Tanjungpura No. 45, Kota Pontianak',
      allergies: 'Tidak ada alergi obat',
      medicalNotes: 'Riwayat gigi sensitif pada kuadran kanan atas',
      emergencyContact: 'Dewi Lestari (Istri)',
      emergencyPhone: '081345678902'
    }
  })

  const patient2 = await prisma.patient.upsert({
    where: { medicalRecordNo: 'RM-2026-0002' },
    update: { fullName: 'Aulia Putri Maharani', phone: '081345678911' },
    create: {
      medicalRecordNo: 'RM-2026-0002',
      nik: '6171022408970003',
      fullName: 'Aulia Putri Maharani',
      email: 'aulia.putri@email.id',
      phone: '081345678911',
      dateOfBirth: new Date('1997-08-24T00:00:00.000Z'),
      gender: 'PEREMPUAN',
      bloodType: 'A',
      address: 'Jl. Sultan Abdurrahman No. 19, Kota Pontianak',
      allergies: 'Penisilin',
      medicalNotes: 'Kontrol ortodonti berkala',
      emergencyContact: 'Haryono (Ayah)',
      emergencyPhone: '081345678912'
    }
  })

  // 8. Obat & Inventory Ledger (FEFO)
  const medicinesSeed = [
    {
      code: 'MED-AMOX-500',
      name: 'Amoxicillin Trihydrate 500 mg',
      genericName: 'Amoxicillin',
      category: 'Antibiotik',
      unit: 'Kapsul',
      unitPrice: 3500,
      minimumStock: 30,
      description: 'Antibiotik spektrum luas untuk infeksi odontogenik.',
      batchNumber: 'BATCH-AMX-2027A',
      expiryDate: new Date('2027-08-30T00:00:00.000Z'),
      initialStock: 150
    },
    {
      code: 'MED-MEFE-500',
      name: 'Asam Mefenamat 500 mg',
      genericName: 'Mefenamic Acid',
      category: 'Analgesik & Antiinflamasi',
      unit: 'Tablet',
      unitPrice: 2500,
      minimumStock: 40,
      description: 'Pereda nyeri gigi akut dan pascatindakan.',
      batchNumber: 'BATCH-MEF-2027B',
      expiryDate: new Date('2027-06-15T00:00:00.000Z'),
      initialStock: 200
    },
    {
      code: 'MED-CHX-02',
      name: 'Chlorhexidine Gluconate 0.2% Mouthwash',
      genericName: 'Chlorhexidine',
      category: 'Antiseptik Mulut',
      unit: 'Botol',
      unitPrice: 48000,
      minimumStock: 15,
      description: 'Obat kumur antiseptik pasca scaling dan bedah mulut.',
      batchNumber: 'BATCH-CHX-2027C',
      expiryDate: new Date('2027-01-10T00:00:00.000Z'),
      initialStock: 12 // Stok rendah untuk demo peringatan stok
    },
    {
      code: 'MED-KETO-10',
      name: 'Ketorolac Tromethamine 10 mg',
      genericName: 'Ketorolac',
      category: 'Analgesik & Antiinflamasi',
      unit: 'Tablet',
      unitPrice: 6500,
      minimumStock: 20,
      description: 'Analgesik nyeri sedang hingga berat pasca odontektomi.',
      batchNumber: 'BATCH-KET-2026X',
      expiryDate: new Date('2026-12-20T00:00:00.000Z'), // Mendekati kedaluwarsa untuk demo
      initialStock: 18
    }
  ]

  for (const med of medicinesSeed) {
    const medicine = await prisma.medicine.upsert({
      where: { code: med.code },
      update: {
        name: med.name,
        genericName: med.genericName,
        category: med.category,
        unit: med.unit,
        unitPrice: med.unitPrice,
        minimumStock: med.minimumStock,
        description: med.description
      },
      create: {
        code: med.code,
        name: med.name,
        genericName: med.genericName,
        category: med.category,
        unit: med.unit,
        unitPrice: med.unitPrice,
        minimumStock: med.minimumStock,
        description: med.description
      }
    })

    await prisma.inventory.upsert({
      where: { medicineId: medicine.id },
      update: { availableStock: med.initialStock, lastRestockAt: new Date() },
      create: {
        medicineId: medicine.id,
        availableStock: med.initialStock,
        reservedStock: 0,
        lastRestockAt: new Date()
      }
    })

    const batch = await prisma.medicineBatch.upsert({
      where: {
        medicineId_batchNumber: {
          medicineId: medicine.id,
          batchNumber: med.batchNumber
        }
      },
      update: {
        expiryDate: med.expiryDate,
        initialQty: med.initialStock,
        remainingQty: med.initialStock
      },
      create: {
        medicineId: medicine.id,
        batchNumber: med.batchNumber,
        expiryDate: med.expiryDate,
        initialQty: med.initialStock,
        remainingQty: med.initialStock,
        purchasePrice: Math.round(med.unitPrice * 0.7),
        supplierName: 'PT Kimia Farma Trading & Distribution'
      }
    })

    const txCount = await prisma.inventoryTransaction.count({
      where: { medicineId: medicine.id }
    })
    if (txCount === 0) {
      await prisma.inventoryTransaction.create({
        data: {
          medicineId: medicine.id,
          batchId: batch.id,
          actorId: adminUser.id,
          type: 'STOCK_IN',
          quantity: med.initialStock,
          balanceBefore: 0,
          balanceAfter: med.initialStock,
          referenceType: 'INITIAL_SEED',
          referenceId: med.batchNumber,
          notes: '[SEED DEVELOPMENT] Saldo awal persediaan obat klinik'
        }
      })
    }
  }

  // 9. Artikel Kesehatan Gigi
  const articlesSeed = [
    {
      slug: 'pentingnya-scaling-gigi-rutin-setiap-6-bulan',
      title: 'Mengapa Scaling Gigi Rutin Setiap 6 Bulan Sangat Penting Bagi Kesehatan Gusi?',
      category: 'Edukasi Perawatan',
      excerpt: 'Karang gigi yang dibiarkan menumpuk dapat memicu radang gusi hingga penyusutan tulang penyangga gigi. Kenali manfaat scaling ultrasonik secara berkala.',
      content: `<p>Banyak orang baru mengunjungi dokter gigi ketika merasakan nyeri hebat. Padahal, penumpukan plak yang mengeras menjadi kalkulus (karang gigi) tidak dapat dibersihkan hanya dengan menyikat gigi di rumah.</p><h3>Apa Itu Karang Gigi?</h3><p>Karang gigi terbentuk dari sisa makanan dan mineral air liur yang mengeras di sepanjang garis gusi. Permukaannya yang kasar menjadi tempat berkembang biaknya bakteri penyebab bau mulut dan radang gusi (gingivitis).</p><h3>Manfaat Scaling Ultrasonik</h3><ul><li>Mencegah perdarahan gusi saat menyikat gigi.</li><li>Mengurangi risiko periodontitis dan gigi goyang.</li><li>Menjaga napas tetap segar dan permukaan gigi lebih bersih.</li></ul>`,
      coverImage: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=900&q=80'
    },
    {
      slug: 'mengenal-perawatan-saluran-akar-solusi-tanpa-cabut-gigi',
      title: 'Mengenal Perawatan Saluran Akar: Solusi Menyelamatkan Gigi Berlubang Parah Tanpa Dicabut',
      category: 'Konservasi Gigi',
      excerpt: 'Gigi yang sudah terasa berdenyut hebat di malam hari tidak selalu harus dicabut. Teknologi endodontik modern memungkinkan gigi asli tetap dipertahankan.',
      content: `<p>Ketika lubang gigi sudah mencapai ruang pulpa yang berisi saraf dan pembuluh darah, bakteri akan menyebabkan infeksi dan rasa nyeri berdenyut. Perawatan Saluran Akar (Root Canal Treatment) hadir untuk membersihkan infeksi tersebut dari dalam akar gigi.</p><h3>Keunggulan Mempertahankan Gigi Asli</h3><p>Gigi alami memiliki ligamen periodontal yang memberikan sensasi kunyah terbaik dan menjaga struktur tulang rahang tetap utuh.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=900&q=80'
    },
    {
      slug: 'panduan-merawat-gigi-anak-sejak-tumbuh-gigi-pertama',
      title: 'Panduan Lengkap Merawat Gigi Susu Anak Sejak Tumbuh Gigi Pertama',
      category: 'Gigi Anak',
      excerpt: 'Gigi susu yang sehat adalah penunjuk jalan bagi tumbuhnya gigi permanen yang rapi. Simak tips pencegahan karies botol susu pada anak.',
      content: `<p>Kesehatan gigi susu sering kali dianggap sepele karena nantinya akan digantikan oleh gigi permanen. Faktanya, gigi susu yang rusak dini dapat menyebabkan gigi permanen tumbuh berjejal.</p><h3>Langkah Pencegahan Dini</h3><ul><li>Bersihkan gusi dan gigi bayi dengan kain kasa lembap setelah menyusu.</li><li>Jadwalkan kunjungan pertama ke dokter gigi anak sejak usia 1 tahun.</li><li>Pertimbangkan aplikasi topikal fluoride untuk memperkuat lapisan email gigi anak.</li></ul>`,
      coverImage: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=900&q=80'
    }
  ]

  for (const art of articlesSeed) {
    await prisma.article.upsert({
      where: { slug: art.slug },
      update: { ...art, authorId: adminUser.id, isPublished: true, publishedAt: new Date() },
      create: { ...art, authorId: adminUser.id, isPublished: true, publishedAt: new Date() }
    })
  }

  // 10. Ulasan Pasien (Reviews)
  const existingReviews = await prisma.review.count()
  if (existingReviews === 0) {
    await prisma.review.createMany({
      data: [
        {
          patientId: patient1.id,
          patientName: 'Budi Santoso',
          serviceName: 'Scaling & Polishing Ultrasonik',
          rating: 5,
          comment: 'Pelayanan sangat ramah dan modern. Booking jadwal dari rumah langsung terkonfirmasi, tanpa antre lama, dan drg. Amanda menjelaskan kondisi gigi saya lewat odontogram dengan sangat detail.',
          isPublished: true
        },
        {
          patientId: patient2.id,
          patientName: 'Aulia Putri Maharani',
          serviceName: 'Konsultasi & Pemasangan Ortodonti (Behel)',
          rating: 5,
          comment: 'Ruang perawatannya bersih, steril, dan nyaman. Riwayat pemeriksaan serta tagihan semuanya bisa saya pantau langsung dari Patient Portal.',
          isPublished: true
        },
        {
          patientName: 'Rizkyriansyah Pratama',
          serviceName: 'Tambal Gigi Estetik (Resin Komposit)',
          rating: 5,
          comment: 'Hasil tambalan gigi depan saya sangat rapi dan warnanya menyatu sempurna dengan gigi asli. Sangat direkomendasikan!',
          isPublished: true
        }
      ]
    })
  }

  // 11. Contoh Appointment, Rekam Medis, Odontogram & Invoice Selesai (untuk demo histori)
  const sampleBookingCode = 'LDC-DEMO-0001'
  const existingAppt = await prisma.appointment.findUnique({ where: { bookingCode: sampleBookingCode } })
  if (!existingAppt && createdDoctors[0] && createdServices[0]) {
    const todayDate = new Date()
    todayDate.setUTCHours(0, 0, 0, 0)

    const appt = await prisma.appointment.create({
      data: {
        bookingCode: sampleBookingCode,
        patientId: patient1.id,
        doctorId: createdDoctors[0].id,
        serviceId: createdServices[0].id,
        appointmentDate: todayDate,
        startTime: '09:30',
        endTime: '10:15',
        slotKey: `${createdDoctors[0].id}_${todayDate.toISOString().slice(0, 10)}_09:30`,
        status: 'COMPLETED',
        chiefComplaint: 'Karang gigi pada rahang bawah dan gigi geraham kanan atas terasa ngilu saat minum dingin.',
        verifiedAt: new Date()
      }
    })

    const medRecord = await prisma.medicalRecord.create({
      data: {
        appointmentId: appt.id,
        patientId: patient1.id,
        doctorId: createdDoctors[0].id,
        chiefComplaint: 'Karang gigi rahang bawah dan ngilu gigi 16.',
        subjective: 'Pasien mengeluhkan gusi mudah berdarah saat menyikat gigi dan ngilu ringan pada gigi geraham kanan atas.',
        objective: 'Kalkulus subgingiva regio 31-43, kavitas superfisial pada permukaan oklusal gigi 16.',
        vitalSignsJson: { bloodPressure: '120/80 mmHg', pulse: 76, temperature: 36.5 },
        assessment: 'K05.0 Acute Gingivitis & K02.1 Karies Dentin Superfisial Gigi 16',
        plan: 'Scaling & Polishing Ultrasonik全rahang + Restorasi Komposit Gigi 16 pada kunjungan lanjutan.',
        clinicalNotes: 'Edukasi teknik menyikat gigi metode Bass dan penggunaan dental floss.'
      }
    })

    await prisma.diagnosis.create({
      data: {
        medicalRecordId: medRecord.id,
        icdCode: 'K05.0',
        name: 'Gingivitis Akut akibat Plak & Kalkulus',
        severity: 'Ringan',
        notes: 'Peradangan margin gingiva regio anterior mandibula'
      }
    })

    await prisma.treatment.create({
      data: {
        medicalRecordId: medRecord.id,
        serviceId: createdServices[0].id,
        toothNumber: 'ALL',
        name: createdServices[0].name,
        fee: createdServices[0].price,
        notes: 'Scaling ultrasonik rahang atas dan bawah selesai tanpa komplikasi'
      }
    })

    const tooth16 = await prisma.tooth.findUnique({ where: { fdiNumber: '16' } })
    if (tooth16) {
      await prisma.odontogram.create({
        data: {
          patientId: patient1.id,
          doctorId: createdDoctors[0].id,
          medicalRecordId: medRecord.id,
          toothId: tooth16.id,
          condition: 'KARIES',
          surfaces: 'O',
          diagnosis: 'Karies Dentin Superfisial (K02.1)',
          treatment: 'Rencana Tambal Komposit',
          notes: 'Kavitas oklusal kedalaman dentin dangkal, tes vitalitas (+)'
        }
      })
    }

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-0001',
        patientId: patient1.id,
        appointmentId: appt.id,
        itemsJson: [
          { name: createdServices[0].name, qty: 1, unitPrice: 350000, subtotal: 350000 },
          { name: 'Biaya Konsultasi Spesialis', qty: 1, unitPrice: 200000, subtotal: 200000 }
        ],
        subtotal: 550000,
        discount: 0,
        tax: 0,
        totalAmount: 550000,
        paidAmount: 0,
        status: 'UNPAID',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
        notes: 'Tagihan pemeriksaan dan tindakan Scaling & Polishing'
      }
    })

    await prisma.notification.create({
      data: {
        userId: patientUser.id,
        type: 'PAYMENT',
        title: 'Tagihan Perawatan #INV-2026-0001 Tersedia',
        message: 'Tagihan perawatan Scaling & Polishing Anda sebesar Rp 550.000 telah diterbitkan. Silakan lakukan pembayaran melalui portal pasien atau kasir klinik.',
        linkUrl: '/patient/payments'
      }
    })
  }

  console.log('✅ Seed database Lumina Dental Care selesai!')
}

main()
  .catch((e) => {
    console.error('❌ Gagal menjalankan seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

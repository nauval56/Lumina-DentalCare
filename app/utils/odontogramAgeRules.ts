export type OdontogramAgeMode = 'PRIMARY' | 'MIXED' | 'PERMANENT'

export interface OdontogramQuickOption {
  label: string
  condition:
  | 'SEHAT'
  | 'KARIES'
  | 'TAMBALAN'
  | 'HILANG'
  | 'SISA_AKAR'
  | 'IMPLAN'
  | 'MAHKOTA'
  | 'PERAWATAN_SALURAN_AKAR'
  | 'GOYANG'
  | 'FRAKTUR'
  treatment: string
  diagnosis?: string
}

export const WISDOM_TEETH_FDI = ['18', '28', '38', '48'] as const

export function isWisdomToothFdi(fdiNumber: string): boolean {
  return (WISDOM_TEETH_FDI as readonly string[]).includes(fdiNumber)
}

export function isDeciduousToothFdi(fdiNumber: string): boolean {
  const q = Number(fdiNumber[0])
  return q >= 5 && q <= 8
}

export function calculatePatientAgeYears(
  dateOfBirth?: string | Date | null,
  referenceDate: Date = new Date()
): number | null {
  if (!dateOfBirth) return null
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return null

  let age = referenceDate.getFullYear() - dob.getFullYear()
  const monthDiff = referenceDate.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < dob.getDate())) {
    age -= 1
  }
  return Math.max(0, age)
}

export function getOdontogramModeByAge(ageYears: number | null): OdontogramAgeMode {
  if (ageYears === null) return 'PERMANENT'
  if (ageYears <= 5) return 'PRIMARY'
  if (ageYears <= 12) return 'MIXED'
  return 'PERMANENT'
}

export function getOdontogramModeMeta(mode: OdontogramAgeMode) {
  if (mode === 'PRIMARY') {
    return {
      label: 'Odontogram Gigi Susu (0–5 Tahun)',
      shortLabel: '20 Gigi Susu (51–85)',
      description: 'Menampilkan 20 gigi susu secara otomatis. Seluruh gigi permanen disembunyikan sesuai usia pasien.'
    }
  }
  if (mode === 'MIXED') {
    return {
      label: 'Odontogram Gigi Campuran (6–12 Tahun)',
      shortLabel: '52 Gigi Campuran (Susu + Permanen)',
      description: 'Menampilkan 20 gigi susu dan 32 gigi permanen secara bersamaan untuk mencatat masa pergantian gigi.'
    }
  }
  return {
    label: 'Odontogram Gigi Permanen (≥13 Tahun)',
    shortLabel: '32 Gigi Permanen (11–48)',
  }
}

export function getWisdomToothRule(ageYears: number | null): {
  bracketLabel: string
  isLockedUnder17: boolean
  options: OdontogramQuickOption[]
} {
  if (ageYears !== null && ageYears < 17) {
    return {
      bracketLabel: 'Usia < 17 Tahun · Gigi Bungsu Belum Erupsi',
      isLockedUnder17: true,
      options: [
        {
          label: 'Belum Erupsi',
          condition: 'SEHAT',
          treatment: 'Belum Erupsi (Usia < 17 Tahun)',
          diagnosis: 'Gigi bungsu belum erupsi sesuai usia'
        }
      ]
    }
  }
  if (ageYears !== null && ageYears <= 25) {
    return {
      bracketLabel: 'Usia 17–25 Tahun · Evaluasi Erupsi Gigi Bungsu',
      isLockedUnder17: false,
      options: [
        { label: 'Erupsi Normal', condition: 'SEHAT', treatment: 'Erupsi Normal' },
        { label: 'Impaksi', condition: 'FRAKTUR', treatment: 'Impaksi Gigi Bungsu', diagnosis: 'Impaksi Molar Ketiga (K01.1)' },
        { label: 'Sebagian Erupsi', condition: 'GOYANG', treatment: 'Sebagian Erupsi (Perikoronitis Observasi)' },
        { label: 'Belum Erupsi', condition: 'SEHAT', treatment: 'Belum Erupsi' }
      ]
    }
  }
  return {
    bracketLabel: 'Usia > 25 Tahun · Status Gigi Bungsu Dewasa',
    isLockedUnder17: false,
    options: [
      { label: 'Ada', condition: 'SEHAT', treatment: 'Ada / Erupsi Lengkap' },
      { label: 'Tidak Ada', condition: 'HILANG', treatment: 'Tidak Ada (Agenesis / Tidak Tumbuh)' },
      { label: 'Impaksi', condition: 'FRAKTUR', treatment: 'Impaksi Gigi Bungsu', diagnosis: 'Impaksi Molar Ketiga (K01.1)' },
      { label: 'Telah Dicabut', condition: 'HILANG', treatment: 'Telah Dicabut (Odontektomi)' }
    ]
  }
}

export function getAgeStatusPresets(
  mode: OdontogramAgeMode,
  fdiNumber: string,
  ageYears: number | null
): {
  title: string
  options: OdontogramQuickOption[]
} {
  if (isWisdomToothFdi(fdiNumber)) {
    const wisdom = getWisdomToothRule(ageYears)
    return {
      title: wisdom.bracketLabel,
      options: wisdom.options
    }
  }

  if (mode === 'PRIMARY') {
    return {
      title: 'Status Gigi Susu (0–5 Tahun)',
      options: [
        { label: 'Sehat', condition: 'SEHAT', treatment: 'Observasi Rutin Gigi Susu' },
        { label: 'Karies', condition: 'KARIES', treatment: 'Perawatan Karies Gigi Susu', diagnosis: 'Karies Gigi Susu (K02)' },
        { label: 'Tambalan', condition: 'TAMBALAN', treatment: 'Tambalan GIC / Komposit Anak' },
        { label: 'Ekstraksi', condition: 'HILANG', treatment: 'Ekstraksi Gigi Susu' },
        { label: 'Agenesis', condition: 'HILANG', treatment: 'Agenesis (Benih Tidak Ada)' },
        { label: 'Lainnya', condition: 'GOYANG', treatment: 'Observasi Kondisi Lainnya' }
      ]
    }
  }

  if (mode === 'MIXED') {
    return {
      title: 'Status Gigi Campuran & Pergantian (6–12 Tahun)',
      options: [
        { label: 'Exfoliation', condition: 'GOYANG', treatment: 'Exfoliation (Gigi Susu Goyang Fisiologis)' },
        { label: 'Gigi sedang tumbuh', condition: 'SEHAT', treatment: 'Gigi Sedang Tumbuh (Erupsi Aktif)' },
        { label: 'Gigi tanggal', condition: 'HILANG', treatment: 'Gigi Tanggal / Lepas Fisiologis' },
        { label: 'Gigi permanen erupsi', condition: 'SEHAT', treatment: 'Gigi Permanen Erupsi' },
        { label: 'Karies', condition: 'KARIES', treatment: 'Perawatan Karies', diagnosis: 'Karies Dentin (K02.1)' },
        { label: 'Tambalan', condition: 'TAMBALAN', treatment: 'Restorasi / Tambalan' }
      ]
    }
  }

  return {
    title: 'Tindakan & Kondisi Gigi Permanen (≥13 Tahun)',
    options: [
      { label: 'Filling', condition: 'TAMBALAN', treatment: 'Filling (Restorasi Komposit)' },
      { label: 'Crown', condition: 'MAHKOTA', treatment: 'Crown (Mahkota Tiruan)' },
      { label: 'Root Canal', condition: 'PERAWATAN_SALURAN_AKAR', treatment: 'Root Canal Treatment (Endodontik)' },
      { label: 'Extraction', condition: 'HILANG', treatment: 'Extraction (Pencabutan Gigi)' },
      { label: 'Implant', condition: 'IMPLAN', treatment: 'Implant Gigi' },
      { label: 'Orthodontic Treatment', condition: 'SEHAT', treatment: 'Orthodontic Treatment' },
      { label: 'Bridge', condition: 'MAHKOTA', treatment: 'Dental Bridge' },
      { label: 'Veneer', condition: 'TAMBALAN', treatment: 'Veneer Estetik' }
    ]
  }
}

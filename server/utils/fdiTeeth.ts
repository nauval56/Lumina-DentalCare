export interface FdiToothDefinition {
  fdiNumber: string
  quadrant: number
  position: number
  toothType: 'PERMANENT' | 'DECIDUOUS'
  nameId: string
  arch: 'ATAS' | 'BAWAH'
  side: 'KANAN' | 'KIRI'
}

const PERMANENT_NAMES: Record<number, string> = {
  1: 'Gigi Seri Tengah (Insisivus Sentral)',
  2: 'Gigi Seri Samping (Insisivus Lateral)',
  3: 'Gigi Taring (Kaninus)',
  4: 'Gigi Geraham Kecil Pertama (Premolar 1)',
  5: 'Gigi Geraham Kecil Kedua (Premolar 2)',
  6: 'Gigi Geraham Besar Pertama (Molar 1)',
  7: 'Gigi Geraham Besar Kedua (Molar 2)',
  8: 'Gigi Geraham Bungsu (Molar 3)'
}

const DECIDUOUS_NAMES: Record<number, string> = {
  1: 'Gigi Susu Seri Tengah (Insisivus Sentral)',
  2: 'Gigi Susu Seri Samping (Insisivus Lateral)',
  3: 'Gigi Susu Taring (Kaninus)',
  4: 'Gigi Susu Geraham Pertama (Molar 1)',
  5: 'Gigi Susu Geraham Kedua (Molar 2)'
}

export function buildFdiTeethCatalog(): FdiToothDefinition[] {
  const teeth: FdiToothDefinition[] = []

  // Permanent quadrants 1-4
  const permanentMeta: Array<{ quadrant: number; arch: 'ATAS' | 'BAWAH'; side: 'KANAN' | 'KIRI' }> = [
    { quadrant: 1, arch: 'ATAS', side: 'KANAN' },
    { quadrant: 2, arch: 'ATAS', side: 'KIRI' },
    { quadrant: 3, arch: 'BAWAH', side: 'KIRI' },
    { quadrant: 4, arch: 'BAWAH', side: 'KANAN' }
  ]

  for (const q of permanentMeta) {
    for (let pos = 1; pos <= 8; pos++) {
      teeth.push({
        fdiNumber: `${q.quadrant}${pos}`,
        quadrant: q.quadrant,
        position: pos,
        toothType: 'PERMANENT',
        nameId: `${PERMANENT_NAMES[pos]} ${q.arch === 'ATAS' ? 'Atas' : 'Bawah'} ${q.side === 'KANAN' ? 'Kanan' : 'Kiri'}`,
        arch: q.arch,
        side: q.side
      })
    }
  }

  // Deciduous quadrants 5-8
  const deciduousMeta: Array<{ quadrant: number; arch: 'ATAS' | 'BAWAH'; side: 'KANAN' | 'KIRI' }> = [
    { quadrant: 5, arch: 'ATAS', side: 'KANAN' },
    { quadrant: 6, arch: 'ATAS', side: 'KIRI' },
    { quadrant: 7, arch: 'BAWAH', side: 'KIRI' },
    { quadrant: 8, arch: 'BAWAH', side: 'KANAN' }
  ]

  for (const q of deciduousMeta) {
    for (let pos = 1; pos <= 5; pos++) {
      teeth.push({
        fdiNumber: `${q.quadrant}${pos}`,
        quadrant: q.quadrant,
        position: pos,
        toothType: 'DECIDUOUS',
        nameId: `${DECIDUOUS_NAMES[pos]} ${q.arch === 'ATAS' ? 'Atas' : 'Bawah'} ${q.side === 'KANAN' ? 'Kanan' : 'Kiri'}`,
        arch: q.arch,
        side: q.side
      })
    }
  }

  return teeth
}

export const FDI_TEETH_CATALOG = buildFdiTeethCatalog()

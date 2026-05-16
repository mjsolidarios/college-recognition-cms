import type { FontPreset } from '@/types/cms'

export const FONT_OPTIONS: { value: FontPreset; label: string; description: string }[] = [
  {
    value: 'helvetica',
    label: 'Helvetica',
    description: 'Clean sans-serif for booklet headings',
  },
  {
    value: 'times',
    label: 'Times',
    description: 'Classic serif for comfortable reading',
  },
]

export function getFontStack(font: FontPreset) {
  switch (font) {
    case 'helvetica':
      return '"Helvetica Neue", Helvetica, Arial, sans-serif'
    case 'times':
      return 'Georgia, "Times New Roman", serif'
  }
}

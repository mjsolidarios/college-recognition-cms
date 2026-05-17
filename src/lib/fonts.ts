import type { FontPreset } from '@/types/cms'

export const FONT_OPTIONS: { value: FontPreset; label: string; description: string }[] = [
  {
    value: 'helvetica',
    label: 'Helvetica',
    description: 'Clean sans-serif for booklet headings',
  },
  {
    value: 'inter',
    label: 'Inter',
    description: 'Modern, highly legible sans-serif from Google Fonts',
  },
  {
    value: 'montserrat',
    label: 'Montserrat',
    description: 'Geometric sans-serif with strong heading presence',
  },
  {
    value: 'poppins',
    label: 'Poppins',
    description: 'Friendly geometric sans-serif for contemporary layouts',
  },
  {
    value: 'source-sans-3',
    label: 'Source Sans 3',
    description: 'Versatile sans-serif from Google Fonts for readable body copy',
  },
  {
    value: 'nunito-sans',
    label: 'Nunito Sans',
    description: 'Rounded sans-serif from Google Fonts with a softer tone',
  },
  {
    value: 'times',
    label: 'Times',
    description: 'Classic serif for comfortable reading',
  },
  {
    value: 'lora',
    label: 'Lora',
    description: 'Balanced serif from Google Fonts with readable italics',
  },
  {
    value: 'merriweather',
    label: 'Merriweather',
    description: 'Serif designed for long-form reading',
  },
  {
    value: 'playfair-display',
    label: 'Playfair Display',
    description: 'Elegant serif suited for formal titles and highlights',
  },
  {
    value: 'libre-baskerville',
    label: 'Libre Baskerville',
    description: 'Traditional serif from Google Fonts for formal long-form text',
  },
  {
    value: 'cormorant-garamond',
    label: 'Cormorant Garamond',
    description: 'Display-friendly serif from Google Fonts with refined contrast',
  },
]

export function getFontStack(font: FontPreset) {
  switch (font) {
    case 'helvetica':
      return '"Helvetica Neue", Helvetica, Arial, sans-serif'
    case 'inter':
      return 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif'
    case 'montserrat':
      return 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif'
    case 'poppins':
      return 'Poppins, "Helvetica Neue", Helvetica, Arial, sans-serif'
    case 'source-sans-3':
      return '"Source Sans 3", "Helvetica Neue", Helvetica, Arial, sans-serif'
    case 'nunito-sans':
      return '"Nunito Sans", "Helvetica Neue", Helvetica, Arial, sans-serif'
    case 'times':
      return 'Georgia, "Times New Roman", serif'
    case 'lora':
      return 'Lora, Georgia, "Times New Roman", serif'
    case 'merriweather':
      return 'Merriweather, Georgia, "Times New Roman", serif'
    case 'playfair-display':
      return '"Playfair Display", Georgia, "Times New Roman", serif'
    case 'libre-baskerville':
      return '"Libre Baskerville", Georgia, "Times New Roman", serif'
    case 'cormorant-garamond':
      return '"Cormorant Garamond", Georgia, "Times New Roman", serif'
  }
}

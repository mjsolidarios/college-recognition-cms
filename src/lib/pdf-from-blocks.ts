import type { jsPDF } from 'jspdf'

import { getRenderedBlockLines } from '@/lib/rendered-block-text'
import { PAGE_HEIGHT, PAGE_WIDTH, type BorderStyle, type RenderTextBlock, type RenderedPage } from '@/types/cms'

/** 1:1 with canvas layout coords; MediaBox is exactly PAGE_WIDTH × PAGE_HEIGHT (not px→pt scaled). */
const PDF_DOC_OPTIONS = {
  unit: 'pt' as const,
  format: [PAGE_WIDTH, PAGE_HEIGHT] as [number, number],
  compress: true,
}

export interface BorderRenderOptions {
  style: BorderStyle
  width: number
  color: string
  padding: number
  separateSides: boolean
  svgLeft: string | null
  svgRight: string | null
  allPages: RenderedPage[]
}

function yieldToMain() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
}

function pdfFontStyle(block: RenderTextBlock) {
  const bold = block.fontWeight === 'bold'
  const italic = block.fontStyle === 'italic'
  if (bold && italic) {
    return 'bolditalic' as const
  }
  if (bold) {
    return 'bold' as const
  }
  if (italic) {
    return 'italic' as const
  }
  return 'normal' as const
}

function textX(block: RenderTextBlock) {
  if (block.align === 'center') {
    return block.x + block.width / 2
  }
  if (block.align === 'right') {
    return block.x + block.width
  }
  return block.x
}

function pdfFontFamily(fontFamily: RenderTextBlock['fontFamily']) {
  switch (fontFamily) {
    case 'times':
    case 'lora':
    case 'merriweather':
    case 'playfair-display':
    case 'libre-baskerville':
    case 'cormorant-garamond':
      return 'times'
    default:
      return 'helvetica'
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return [isNaN(r) ? 26 : r, isNaN(g) ? 26 : g, isNaN(b) ? 26 : b]
}

function shouldPageHaveBorder(page: RenderedPage, allPages: RenderedPage[]): boolean {
  if (allPages.length < 3) return false
  const firstNum = allPages[0]?.pageNumber
  const lastNum = allPages[allPages.length - 1]?.pageNumber
  return page.pageNumber !== firstNum && page.pageNumber !== lastNum
}

function drawPresetBorder(doc: jsPDF, style: BorderStyle, width: number, color: string, padding: number) {
  const [r, g, b] = hexToRgb(color)
  doc.setDrawColor(r, g, b)
  doc.setLineWidth(width)

  const x = padding
  const y = padding
  const w = PAGE_WIDTH - padding * 2
  const h = PAGE_HEIGHT - padding * 2

  if (style === 'simple') {
    doc.rect(x, y, w, h, 'S')
  } else if (style === 'double') {
    doc.rect(x, y, w, h, 'S')
    const gap = width * 2 + 2
    doc.setLineWidth(width * 0.5)
    doc.rect(x + gap, y + gap, w - gap * 2, h - gap * 2, 'S')
  } else if (style === 'decorative-corners') {
    const arm = Math.min(w, h) * 0.08
    // Top-left
    doc.line(x, y, x + arm, y)
    doc.line(x, y, x, y + arm)
    // Top-right
    doc.line(x + w, y, x + w - arm, y)
    doc.line(x + w, y, x + w, y + arm)
    // Bottom-left
    doc.line(x, y + h, x + arm, y + h)
    doc.line(x, y + h, x, y + h - arm)
    // Bottom-right
    doc.line(x + w, y + h, x + w - arm, y + h)
    doc.line(x + w, y + h, x + w, y + h - arm)
  }
}

function drawBlock(doc: jsPDF, block: RenderTextBlock) {
  const lines = getRenderedBlockLines(block)
  if (!lines.length) {
    return
  }

  doc.setFont(pdfFontFamily(block.fontFamily), pdfFontStyle(block))
  doc.setFontSize(block.fontSize)
  doc.setTextColor(38, 37, 30)

  const text = lines.join('\n')
  const lineHeightFactor = block.lineHeight / block.fontSize

  doc.text(text, textX(block), block.y, {
    baseline: 'top',
    align: block.align,
    maxWidth: block.width,
    lineHeightFactor,
  })
}

function drawPage(doc: jsPDF, page: RenderedPage, borderOptions?: BorderRenderOptions | null) {
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F')

  for (const block of page.blocks) {
    drawBlock(doc, block)
  }

  if (borderOptions && shouldPageHaveBorder(page, borderOptions.allPages)) {
    if (borderOptions.style === 'custom') {
      // In standard book layout: odd pages are right-facing (recto), even pages are left-facing (verso).
      const isEven = page.pageNumber % 2 === 0
      const dataUrl = borderOptions.separateSides
        ? (isEven ? borderOptions.svgLeft : borderOptions.svgRight)
        : borderOptions.svgLeft
      if (dataUrl) {
        doc.addImage(dataUrl, 'PNG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT)
      }
    } else {
      drawPresetBorder(doc, borderOptions.style, borderOptions.width, borderOptions.color, borderOptions.padding)
    }
  }
}

export async function renderPdfBlob(
  pages: RenderedPage[],
  onPage?: (current: number, total: number) => void,
  frontCover?: string | null,
  backCover?: string | null,
  borderOptions?: BorderRenderOptions | null,
) {
  const { jsPDF } = await import('jspdf')

  // Build ordered list of "slots": cover images or rendered pages
  type Slot = { kind: 'cover'; dataUrl: string } | { kind: 'page'; page: RenderedPage }
  const slots: Slot[] = []
  if (frontCover) slots.push({ kind: 'cover', dataUrl: frontCover })
  for (const page of pages) slots.push({ kind: 'page', page })
  if (backCover) slots.push({ kind: 'cover', dataUrl: backCover })

  const total = slots.length

  if (total === 0) {
    const doc = new jsPDF(PDF_DOC_OPTIONS)
    return doc.output('blob')
  }

  const doc = new jsPDF(PDF_DOC_OPTIONS)

  const drawSlot = (slot: Slot) => {
    if (slot.kind === 'cover') {
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F')
      doc.addImage(slot.dataUrl, 0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    } else {
      drawPage(doc, slot.page, borderOptions)
    }
  }

  drawSlot(slots[0]!)
  onPage?.(0, total)

  for (let index = 1; index < total; index += 1) {
    await yieldToMain()
    doc.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'p')
    drawSlot(slots[index]!)
    onPage?.(index, total)
  }

  return doc.output('blob')
}

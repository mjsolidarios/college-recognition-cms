import type { jsPDF } from 'jspdf'

import { getRenderedBlockLines } from '@/lib/rendered-block-text'
import { PAGE_HEIGHT, PAGE_WIDTH, type RenderTextBlock, type RenderedPage } from '@/types/cms'

/** 1:1 with canvas layout coords; MediaBox is exactly PAGE_WIDTH × PAGE_HEIGHT (not px→pt scaled). */
const PDF_DOC_OPTIONS = {
  unit: 'pt' as const,
  format: [PAGE_WIDTH, PAGE_HEIGHT] as [number, number],
  compress: true,
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
      return 'times'
    default:
      return 'helvetica'
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

function drawPage(doc: jsPDF, page: RenderedPage) {
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F')

  for (const block of page.blocks) {
    drawBlock(doc, block)
  }
}

export async function renderPdfBlob(
  pages: RenderedPage[],
  onPage?: (current: number, total: number) => void,
  frontCover?: string | null,
  backCover?: string | null,
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
      drawPage(doc, slot.page)
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

import { getRenderedBlockLines } from '@/lib/rendered-block-text'
import { getFontStack } from '@/lib/fonts'
import { type PdfExportProgress } from '@/lib/pdf-worker-protocol'
import { downloadFile, slugify } from '@/lib/utils'
import { PAGE_HEIGHT, PAGE_WIDTH, type CmsSettings, type RenderedPage } from '@/types/cms'

export type { PdfExportProgress }
export type SvgExportSlot = { kind: 'cover'; dataUrl: string; label: string } | { kind: 'page'; page: RenderedPage }
export type SvgBorderSettings = Pick<
  CmsSettings,
  'borderEnabled' | 'borderStyle' | 'borderWidth' | 'borderColor' | 'borderPadding' | 'borderSeparateSides' | 'borderSvgLeft' | 'borderSvgRight'
>

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function renderSvgBlock(block: RenderedPage['blocks'][number]) {
  const blockY = block.y
  const textAnchor = block.align === 'center' ? 'middle' : block.align === 'right' ? 'end' : 'start'
  const x = block.align === 'center' ? block.x + block.width / 2 : block.align === 'right' ? block.x + block.width : block.x
  const lines = getRenderedBlockLines(block)

  return `<text x="${x}" y="${blockY}" font-family="${escapeXml(getFontStack(block.fontFamily))}" font-size="${block.fontSize}" font-weight="${block.fontWeight}" font-style="${block.fontStyle}" letter-spacing="${block.letterSpacing ?? 0}" text-anchor="${textAnchor}">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : block.lineHeight}">${escapeXml(line || ' ')}</tspan>`)
    .join('')}</text>`
}

function shouldPageHaveBorder(page: RenderedPage, allPages: RenderedPage[]): boolean {
  if (allPages.length < 3) return false
  const firstNum = allPages[0]?.pageNumber
  const lastNum = allPages[allPages.length - 1]?.pageNumber
  return page.pageNumber !== firstNum && page.pageNumber !== lastNum
}

function renderSvgBorder(page: RenderedPage, settings: SvgBorderSettings, allPages: RenderedPage[]): string {
  if (!settings.borderEnabled || !shouldPageHaveBorder(page, allPages)) return ''

  const { borderStyle, borderWidth, borderColor, borderPadding, borderSeparateSides, borderSvgLeft, borderSvgRight } = settings

  if (borderStyle === 'custom') {
    // In standard book layout: odd pages are right-facing (recto), even pages are left-facing (verso).
    const isEven = page.pageNumber % 2 === 0
    const dataUrl = borderSeparateSides ? (isEven ? borderSvgLeft : borderSvgRight) : borderSvgLeft
    if (!dataUrl) return ''
    return `<image href="${dataUrl}" x="0" y="0" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" preserveAspectRatio="none"/>`
  }

  const x = borderPadding
  const y = borderPadding
  const w = PAGE_WIDTH - borderPadding * 2
  const h = PAGE_HEIGHT - borderPadding * 2
  const stroke = `stroke="${escapeXml(borderColor)}" stroke-width="${borderWidth}" fill="none"`

  if (borderStyle === 'simple') {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${stroke}/>`
  }

  if (borderStyle === 'double') {
    const gap = borderWidth * 2 + 2
    return [
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${stroke}/>`,
      `<rect x="${x + gap}" y="${y + gap}" width="${w - gap * 2}" height="${h - gap * 2}" stroke="${escapeXml(borderColor)}" stroke-width="${borderWidth * 0.5}" fill="none"/>`,
    ].join('')
  }

  if (borderStyle === 'decorative-corners') {
    const arm = Math.min(w, h) * 0.08
    const lineAttrs = `stroke="${escapeXml(borderColor)}" stroke-width="${borderWidth}"`
    return [
      // Top-left
      `<line x1="${x}" y1="${y}" x2="${x + arm}" y2="${y}" ${lineAttrs}/>`,
      `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + arm}" ${lineAttrs}/>`,
      // Top-right
      `<line x1="${x + w}" y1="${y}" x2="${x + w - arm}" y2="${y}" ${lineAttrs}/>`,
      `<line x1="${x + w}" y1="${y}" x2="${x + w}" y2="${y + arm}" ${lineAttrs}/>`,
      // Bottom-left
      `<line x1="${x}" y1="${y + h}" x2="${x + arm}" y2="${y + h}" ${lineAttrs}/>`,
      `<line x1="${x}" y1="${y + h}" x2="${x}" y2="${y + h - arm}" ${lineAttrs}/>`,
      // Bottom-right
      `<line x1="${x + w}" y1="${y + h}" x2="${x + w - arm}" y2="${y + h}" ${lineAttrs}/>`,
      `<line x1="${x + w}" y1="${y + h}" x2="${x + w}" y2="${y + h - arm}" ${lineAttrs}/>`,
    ].join('')
  }

  return ''
}

/** Build SVG markup for one or more rendered slots so export and clipboard flows share identical layout output. */
function buildSvgDocumentMarkup(
  slots: SvgExportSlot[],
  settings?: SvgBorderSettings,
  allRenderedPages?: RenderedPage[],
) {
  const spacing = 24
  const contextPages = allRenderedPages ?? slots.flatMap((slot) => (slot.kind === 'page' ? [slot.page] : []))
  const totalHeight = slots.length * PAGE_HEIGHT + Math.max(0, slots.length - 1) * spacing

  const renderCoverSlot = (dataUrl: string, pageOffset: number, label: string) =>
    [
      `<g transform="translate(0 ${pageOffset})">`,
      `<title>${escapeXml(label)}</title>`,
      `<rect width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="#ffffff"/>`,
      `<image href="${dataUrl}" x="0" y="0" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" preserveAspectRatio="xMidYMid meet"/>`,
      `</g>`,
    ].join('')

  const renderPageSlot = (page: RenderedPage, pageOffset: number) => {
    const borderMarkup = settings ? renderSvgBorder(page, settings, contextPages) : ''
    return [
      `<g transform="translate(0 ${pageOffset})">`,
      `<rect width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="#ffffff"/>`,
      ...page.blocks.map((block) => renderSvgBlock(block)),
      borderMarkup,
      `</g>`,
    ].join('')
  }

  const renderSlot = (slot: SvgExportSlot, index: number) => {
    const pageOffset = index * (PAGE_HEIGHT + spacing)
    return slot.kind === 'cover'
      ? renderCoverSlot(slot.dataUrl, pageOffset, slot.label)
      : renderPageSlot(slot.page, pageOffset)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${PAGE_WIDTH}" height="${totalHeight}" viewBox="0 0 ${PAGE_WIDTH} ${totalHeight}">
  <rect width="100%" height="100%" fill="#f5f5f4" />
  ${slots.map((slot, index) => renderSlot(slot, index)).join('')}
</svg>`
}

/** Preload jsPDF so the first export does not wait on the dynamic import. */
export function warmPdfExportWorker() {
  void import('jspdf')
}

export async function exportPdfDocument(
  pages: RenderedPage[],
  title: string,
  onProgress?: (progress: PdfExportProgress) => void,
  frontCover?: string | null,
  backCover?: string | null,
  settings?: CmsSettings,
) {
  const coverCount = (frontCover ? 1 : 0) + (backCover ? 1 : 0)
  const total = pages.length + coverCount
  const report = onProgress ?? (() => {})

  report({ phase: 'prepare', current: 0, total, message: 'Loading PDF engine…' })

  const { renderPdfBlob } = await import('@/lib/pdf-from-blocks')

  const borderOptions =
    settings?.borderEnabled
      ? {
          style: settings.borderStyle,
          width: settings.borderWidth,
          color: settings.borderColor,
          padding: settings.borderPadding,
          separateSides: settings.borderSeparateSides,
          svgLeft: settings.borderSvgLeft,
          svgRight: settings.borderSvgRight,
          allPages: pages,
        }
      : null

  const blob = await renderPdfBlob(
    pages,
    (current, pageTotal) => {
      report({
        phase: 'render',
        current,
        total: pageTotal,
        message: pageTotal > 0 ? `Rendering page ${current + 1} of ${pageTotal}…` : 'Rendering PDF…',
      })
    },
    frontCover,
    backCover,
    borderOptions,
  )

  report({ phase: 'save', current: total, total, message: 'Saving file…' })
  downloadFile(blob, `${slugify(title) || 'college-recognition'}.pdf`)
}

export function exportSvgDocument(
  pages: RenderedPage[],
  title: string,
  frontCover?: string | null,
  backCover?: string | null,
  settings?: SvgBorderSettings,
  allRenderedPages?: RenderedPage[],
) {
  const slots: SvgExportSlot[] = []
  if (frontCover) slots.push({ kind: 'cover', dataUrl: frontCover, label: 'Front Cover' })
  for (const page of pages) slots.push({ kind: 'page', page })
  if (backCover) slots.push({ kind: 'cover', dataUrl: backCover, label: 'Back Cover' })
  const markup = buildSvgDocumentMarkup(slots, settings, allRenderedPages)

  const base = slugify(title) || 'college-recognition'
  const fileName = pages.length === 1 && !frontCover && !backCover ? `${base}-page-${pages[0]?.pageNumber ?? 1}` : `${base}`

  downloadFile(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), `${fileName}.svg`)
}

/** Copy a single preview slot to the clipboard as SVG-first data with plain-text fallback for Figma paste support. */
export async function copySlotAsFigmaLayout(
  slot: SvgExportSlot,
  settings?: SvgBorderSettings,
  allRenderedPages?: RenderedPage[],
) {
  const markup = buildSvgDocumentMarkup([slot], settings, allRenderedPages)
  const richClipboardErrorMessage = 'Failed to copy the Figma layout as rich SVG clipboard data.'

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/svg+xml': new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }),
          'text/html': new Blob([markup], { type: 'text/html;charset=utf-8' }),
          'text/plain': new Blob([markup], { type: 'text/plain;charset=utf-8' }),
        }),
      ])
      return
    } catch (richClipboardError) {
      try {
        await navigator.clipboard.writeText(markup)
        return
      } catch (textClipboardError) {
        const richMessage = richClipboardError instanceof Error ? richClipboardError.message : richClipboardErrorMessage
        const textMessage = textClipboardError instanceof Error ? textClipboardError.message : 'Failed to copy the Figma layout as plain text.'
        throw new Error(`${richMessage} Fallback plain-text copy also failed: ${textMessage}`)
      }
    }
  }

  await navigator.clipboard.writeText(markup)
}

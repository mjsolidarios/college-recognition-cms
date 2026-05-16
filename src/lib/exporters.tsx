import { getRenderedBlockLines } from '@/lib/rendered-block-text'
import { getFontStack } from '@/lib/fonts'
import { type PdfExportProgress } from '@/lib/pdf-worker-protocol'
import { downloadFile, slugify } from '@/lib/utils'
import { PAGE_HEIGHT, PAGE_WIDTH, type RenderedPage } from '@/types/cms'

export type { PdfExportProgress }

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

/** Preload jsPDF so the first export does not wait on the dynamic import. */
export function warmPdfExportWorker() {
  void import('jspdf')
}

export async function exportPdfDocument(
  pages: RenderedPage[],
  title: string,
  onProgress?: (progress: PdfExportProgress) => void,
) {
  const total = pages.length
  const report = onProgress ?? (() => {})

  report({ phase: 'prepare', current: 0, total, message: 'Loading PDF engine…' })

  const { renderPdfBlob } = await import('@/lib/pdf-from-blocks')
  const blob = await renderPdfBlob(pages, (current, pageTotal) => {
    report({
      phase: 'render',
      current,
      total: pageTotal,
      message: pageTotal > 0 ? `Rendering page ${current + 1} of ${pageTotal}…` : 'Rendering PDF…',
    })
  })

  report({ phase: 'save', current: total, total, message: 'Saving file…' })
  downloadFile(blob, `${slugify(title) || 'college-recognition'}.pdf`)
}

export function exportSvgDocument(pages: RenderedPage[], title: string) {
  const spacing = 24
  const totalHeight = pages.length * PAGE_HEIGHT + Math.max(0, pages.length - 1) * spacing
  const markup = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_WIDTH}" height="${totalHeight}" viewBox="0 0 ${PAGE_WIDTH} ${totalHeight}">
  <rect width="100%" height="100%" fill="#f5f5f4" />
  ${pages
    .map((page, index) => {
      const pageOffset = index * (PAGE_HEIGHT + spacing)
      return `<g transform="translate(0 ${pageOffset})"><rect width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="#ffffff"/>${page.blocks.map((block) => renderSvgBlock(block)).join('')}</g>`
    })
    .join('')}
</svg>`

  const base = slugify(title) || 'college-recognition'
  const fileName = pages.length === 1 ? `${base}-page-${pages[0]?.pageNumber ?? 1}` : `${base}`

  downloadFile(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), `${fileName}.svg`)
}

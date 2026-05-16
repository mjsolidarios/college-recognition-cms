import { getRenderedBlockLines } from '@/lib/layout'
import { downloadFile, slugify } from '@/lib/utils'
import { PAGE_HEIGHT, PAGE_WIDTH, type RenderedPage } from '@/types/cms'

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

/** Coordinates are in the SVG group translated by page offset — do not double-apply vertical offset here. */
function renderSvgBlock(block: RenderedPage['blocks'][number]) {
  const blockY = block.y
  const textAnchor = block.align === 'center' ? 'middle' : block.align === 'right' ? 'end' : 'start'
  const x = block.align === 'center' ? block.x + block.width / 2 : block.align === 'right' ? block.x + block.width : block.x
  const lines = getRenderedBlockLines(block)

  return `<text x="${x}" y="${blockY}" font-family="Georgia, Times New Roman, serif" font-size="${block.fontSize}" font-weight="${block.fontWeight}" font-style="${block.fontStyle}" letter-spacing="${block.letterSpacing ?? 0}" text-anchor="${textAnchor}">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : block.lineHeight}">${escapeXml(line || ' ')}</tspan>`)
    .join('')}</text>`
}

export async function exportPdfDocument(pages: RenderedPage[], title: string) {
  const [rendererModule, pdfDocumentModule] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/pdf-document'),
  ])
  const createPdf = rendererModule.pdf
  const PdfDocument = pdfDocumentModule.PdfDocument

  if (typeof createPdf !== 'function' || typeof PdfDocument === 'undefined') {
    throw new Error('Failed to load @react-pdf/renderer or the PdfDocument component.')
  }

  const blob = await createPdf(<PdfDocument pages={pages} />).toBlob()
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
  const fileName =
    pages.length === 1 ? `${base}-page-${pages[0]?.pageNumber ?? 1}` : `${base}`

  downloadFile(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), `${fileName}.svg`)
}

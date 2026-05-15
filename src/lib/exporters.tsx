import { pdf } from '@react-pdf/renderer'

import { PdfDocument } from '@/components/pdf-document'
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

function renderSvgBlock(pageOffset: number, block: RenderedPage['blocks'][number]) {
  const blockY = pageOffset + block.y
  const textAnchor = block.align === 'center' ? 'middle' : block.align === 'right' ? 'end' : 'start'
  const x = block.align === 'center' ? block.x + block.width / 2 : block.align === 'right' ? block.x + block.width : block.x

  return `<text x="${x}" y="${blockY}" font-family="Georgia, Times New Roman, serif" font-size="${block.fontSize}" font-weight="${block.fontWeight}" font-style="${block.fontStyle}" letter-spacing="${block.letterSpacing ?? 0}" text-anchor="${textAnchor}" text-transform="${block.uppercase ? 'uppercase' : 'none'}">${block.lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : block.lineHeight}">${escapeXml(line || ' ')}</tspan>`)
    .join('')}</text>`
}

export async function exportPdfDocument(pages: RenderedPage[], title: string) {
  const blob = await pdf(<PdfDocument pages={pages} />).toBlob()
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
      return `<g transform="translate(0 ${pageOffset})"><rect width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="#ffffff"/>${page.blocks.map((block) => renderSvgBlock(pageOffset, block)).join('')}</g>`
    })
    .join('')}
</svg>`

  downloadFile(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), `${slugify(title) || 'college-recognition'}.svg`)
}

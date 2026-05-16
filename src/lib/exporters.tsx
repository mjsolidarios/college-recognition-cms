import { getRenderedBlockLines } from '@/lib/layout'
import type { PdfExportWorkerRequest, PdfExportWorkerResponse } from '@/lib/pdf-export-worker'
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

let pdfExportWorker: Worker | null = null
let pdfExportRequestCounter = 0

function getPdfExportWorker() {
  pdfExportWorker ??= new Worker(new URL('./pdf-export.worker.tsx', import.meta.url), { type: 'module' })
  return pdfExportWorker
}

function createPdfExportRequestId() {
  pdfExportRequestCounter += 1
  return globalThis.crypto?.randomUUID?.() ?? `pdf-export-${Date.now()}-${pdfExportRequestCounter}`
}

function renderPdfInWorker(pages: RenderedPage[]) {
  return new Promise<Blob>((resolve, reject) => {
    const worker = getPdfExportWorker()
    const requestId = createPdfExportRequestId()
    const cleanup = () => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
    }
    const handleMessage = (event: MessageEvent<PdfExportWorkerResponse>) => {
      if (event.data.id !== requestId) {
        return
      }

      cleanup()

      if (!event.data.ok) {
        reject(new Error(event.data.error))
        return
      }

      resolve(new Blob([event.data.buffer], { type: 'application/pdf' }))
    }
    const handleError = (event: ErrorEvent) => {
      cleanup()
      reject(event.error instanceof Error ? event.error : new Error(event.message || 'Failed to generate the PDF export.'))
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)
    worker.postMessage({ id: requestId, pages } satisfies PdfExportWorkerRequest)
  })
}

async function renderPdfOnMainThread(pages: RenderedPage[]) {
  const pdfRenderModule = await import('@/lib/pdf-render')
  return pdfRenderModule.renderPdfBlob(pages)
}

export async function exportPdfDocument(pages: RenderedPage[], title: string) {
  let blob: Blob

  try {
    blob = await renderPdfInWorker(pages)
  } catch (error) {
    console.warn('PDF export worker failed; retrying on the main thread.', error)
    blob = await renderPdfOnMainThread(pages)
  }

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

import {
  PDF_EXPORT_FAILURE_MESSAGE,
  type PdfExportWorkerRequest,
  type PdfExportWorkerResponse,
} from '@/lib/pdf-worker-protocol'
import { renderPdfBlob } from '@/lib/pdf-render'

function post(message: PdfExportWorkerResponse) {
  self.postMessage(message)
}

self.addEventListener('message', async (event: MessageEvent<PdfExportWorkerRequest>) => {
  const { id, pages } = event.data
  const total = pages.length

  post({
    id,
    type: 'progress',
    progress: { phase: 'render', current: 0, total, message: 'Rendering PDF…' },
  })

  try {
    const blob = await renderPdfBlob(pages)

    post({
      id,
      type: 'progress',
      progress: { phase: 'save', current: total, total, message: 'Preparing download…' },
    })

    const buffer = await blob.arrayBuffer()
    post({ id, type: 'result', ok: true, buffer })
  } catch (error) {
    post({
      id,
      type: 'result',
      ok: false,
      error: error instanceof Error ? error.message : PDF_EXPORT_FAILURE_MESSAGE,
    })
  }
})

export {}

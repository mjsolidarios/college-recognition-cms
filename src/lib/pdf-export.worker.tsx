import { PDF_EXPORT_FAILURE_MESSAGE, type PdfExportWorkerRequest, type PdfExportWorkerResponse } from '@/lib/pdf-worker-protocol'
import { renderPdfBlob } from '@/lib/pdf-render'

self.addEventListener('message', async (event: MessageEvent<PdfExportWorkerRequest>) => {
  try {
    const blob = await renderPdfBlob(event.data.pages)
    const buffer = await blob.arrayBuffer()
    const response: PdfExportWorkerResponse = { id: event.data.id, ok: true, buffer }
    self.postMessage(response)
  } catch (error) {
    const response: PdfExportWorkerResponse = {
      id: event.data.id,
      ok: false,
      error: error instanceof Error ? error.message : PDF_EXPORT_FAILURE_MESSAGE,
    }
    self.postMessage(response)
  }
})

export {}

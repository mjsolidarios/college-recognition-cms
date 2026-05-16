import type { PdfExportWorkerRequest, PdfExportWorkerResponse } from '@/lib/pdf-export-worker'
import { renderPdfBlob } from '@/lib/pdf-render'

const workerScope = self as DedicatedWorkerGlobalScope

workerScope.addEventListener('message', async (event: MessageEvent<PdfExportWorkerRequest>) => {
  try {
    const blob = await renderPdfBlob(event.data.pages)
    const buffer = await blob.arrayBuffer()
    const response: PdfExportWorkerResponse = { id: event.data.id, ok: true, buffer }
    workerScope.postMessage(response, [buffer])
  } catch (error) {
    const response: PdfExportWorkerResponse = {
      id: event.data.id,
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to generate the PDF export.',
    }
    workerScope.postMessage(response)
  }
})

export {}

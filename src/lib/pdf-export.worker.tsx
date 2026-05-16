import { PDF_EXPORT_FAILURE_MESSAGE, type PdfExportWorkerRequest, type PdfExportWorkerResponse } from '@/lib/pdf-worker-protocol'
import { renderPdfBlob } from '@/lib/pdf-render'

const workerScope = globalThis
const workerPostMessage = globalThis.postMessage as unknown as (
  message: PdfExportWorkerResponse,
  transfer?: Transferable[],
) => void

workerScope.addEventListener('message', async (event: MessageEvent<PdfExportWorkerRequest>) => {
  try {
    const blob = await renderPdfBlob(event.data.pages)
    const buffer = await blob.arrayBuffer()
    const response: PdfExportWorkerResponse = { id: event.data.id, ok: true, buffer }
    workerPostMessage(response, [buffer])
  } catch (error) {
    const response: PdfExportWorkerResponse = {
      id: event.data.id,
      ok: false,
      error: error instanceof Error ? error.message : PDF_EXPORT_FAILURE_MESSAGE,
    }
    workerPostMessage(response)
  }
})

export {}

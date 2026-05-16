import type { RenderedPage } from '@/types/cms'

export const PDF_EXPORT_FAILURE_MESSAGE = 'Failed to generate the PDF export.'

export type PdfExportWorkerRequest = {
  id: string
  pages: RenderedPage[]
}

/**
 * Success responses return the PDF payload in `buffer`.
 * Error responses set `ok` to false and include a human-readable `error`.
 */
export type PdfExportWorkerResponse =
  | {
    id: string
    ok: true
    buffer: ArrayBuffer
  }
  | {
    id: string
    ok: false
    error: string
  }

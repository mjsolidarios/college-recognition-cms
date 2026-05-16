import type { RenderedPage } from '@/types/cms'

export type PdfExportWorkerRequest = {
  id: string
  pages: RenderedPage[]
}

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

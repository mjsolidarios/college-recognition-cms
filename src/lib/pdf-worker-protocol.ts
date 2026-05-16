import type { RenderedPage } from '@/types/cms'

export const PDF_EXPORT_FAILURE_MESSAGE = 'Failed to generate the PDF export.'

export type PdfExportProgress = {
  phase: 'prepare' | 'render' | 'save'
  current: number
  total: number
  message: string
}

export type PdfExportWorkerRequest = {
  id: string
  pages: RenderedPage[]
}

export type PdfExportWorkerProgressMessage = {
  id: string
  type: 'progress'
  progress: PdfExportProgress
}

export type PdfExportWorkerResultMessage =
  | {
      id: string
      type: 'result'
      ok: true
      buffer: ArrayBuffer
    }
  | {
      id: string
      type: 'result'
      ok: false
      error: string
    }

export type PdfExportWorkerResponse = PdfExportWorkerProgressMessage | PdfExportWorkerResultMessage

export function progressPercent(progress: PdfExportProgress) {
  const total = Math.max(progress.total, 1)
  const ratio = progress.current / total
  if (progress.phase === 'prepare') {
    return Math.round(ratio * 12)
  }
  if (progress.phase === 'save') {
    return 88 + Math.round(ratio * 12)
  }
  return 12 + Math.round(ratio * 76)
}

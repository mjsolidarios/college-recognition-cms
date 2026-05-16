import { pdf } from '@react-pdf/renderer'

import { PdfDocument } from '@/components/pdf-document'
import type { RenderedPage } from '@/types/cms'

export function renderPdfBlob(pages: RenderedPage[]) {
  return pdf(<PdfDocument pages={pages} />).toBlob()
}

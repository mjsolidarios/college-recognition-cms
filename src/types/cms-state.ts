import type { CmsPage, CmsSettings } from '@/types/cms'

export const CMS_DOCUMENT_SLUG = 'default'

export interface CmsState {
  pages: CmsPage[]
  settings: CmsSettings
  documentTitle: string
  frontCover: string | null
  backCover: string | null
}

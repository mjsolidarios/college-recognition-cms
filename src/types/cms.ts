export const PAGE_WIDTH = 600
export const PAGE_HEIGHT = 888

export type PageType = 'program' | 'academic' | 'non-academic' | 'core'
export type FontPreset = 'times' | 'helvetica'

export interface ProgramRow {
  id: string
  leftTitle: string
  leftBody: string
  rightTitle?: string
  rightBody?: string
}

export interface AcademicEntry {
  id: string
  name: string
  award: string
  category: string
  gradeLevel: string
}

export interface NonAcademicEntry {
  id: string
  name: string
  award: string
  category: string
}

export interface CoreSection {
  id: string
  title: string
  body: string
}

export interface BasePage {
  id: string
  type: PageType
  title: string
  order: number
}

export interface ProgramPage extends BasePage {
  type: 'program'
  content: {
    heading: string
    rows: ProgramRow[]
  }
}

export interface AcademicPage extends BasePage {
  type: 'academic'
  content: {
    heading: string
    entries: AcademicEntry[]
  }
}

export interface NonAcademicPage extends BasePage {
  type: 'non-academic'
  content: {
    heading: string
    entries: NonAcademicEntry[]
  }
}

export interface CorePage extends BasePage {
  type: 'core'
  content: {
    heading: string
    subheading?: string
    sections: CoreSection[]
  }
}

export type CmsPage = ProgramPage | AcademicPage | NonAcademicPage | CorePage

export interface CmsSettings {
  globalScale: number
  titleSize: number
  subtitleSize: number
  headingSize: number
  bodySize: number
  headingFont: FontPreset
  bodyFont: FontPreset
  metaSize: number
  pageNumberSize: number
  pagePaddingTop: number
  pagePaddingBottom: number
  pagePaddingX: number
  columnGap: number
  lineHeight: number
  showPageNumbers: boolean
  documentYear: string
}

export interface RenderTextBlock {
  id: string
  x: number
  y: number
  width: number
  lines: string[]
  fontFamily: FontPreset
  fontSize: number
  lineHeight: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  align: 'left' | 'center' | 'right'
  uppercase?: boolean
  letterSpacing?: number
}

export interface RenderedPage {
  id: string
  sourcePageId: string
  sourcePageType: PageType
  pageNumber: number
  blocks: RenderTextBlock[]
}

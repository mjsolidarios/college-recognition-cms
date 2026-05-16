import type { CmsPage, CmsSettings, AcademicEntry, NonAcademicEntry, ProgramRow, CoreSection } from '@/types/cms'
import { defaultSettings } from '@/lib/sample-data'
import { isValidFlowPosition, normalizeFlowPosition } from '@/lib/flow-position'

/* ── Export schema ────────────────────────────────────────── */

export interface BookletExport {
  version: 1
  title: string
  exportedAt: string
  pages: CmsPage[]
  settings?: CmsSettings
  frontCover?: string | null
  backCover?: string | null
}

/* ── Export ────────────────────────────────────────────────── */

export function exportBooklet(
  pages: CmsPage[],
  settings: CmsSettings,
  title: string,
  frontCover?: string | null,
  backCover?: string | null,
): string {
  const data: BookletExport = {
    version: 1,
    title,
    exportedAt: new Date().toISOString(),
    pages: [...pages].sort((a, b) => a.order - b.order),
    settings,
    frontCover: frontCover ?? null,
    backCover: backCover ?? null,
  }
  return JSON.stringify(data, null, 2)
}

/* ── Validation ───────────────────────────────────────────── */

const VALID_TYPES = new Set(['program', 'academic', 'non-academic', 'core'])

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validatePageContent(page: Record<string, unknown>, index: number): string[] {
  const errors: string[] = []
  const content = page.content

  if (!isObject(content)) {
    errors.push(`Page ${index}: "content" must be an object`)
    return errors
  }

  if (typeof content.heading !== 'string') {
    errors.push(`Page ${index}: "content.heading" must be a string`)
  }

  const type = page.type as string

  if (type === 'program') {
    if (!Array.isArray(content.rows)) {
      errors.push(`Page ${index}: program page requires "content.rows" array`)
    } else {
      for (let i = 0; i < content.rows.length; i++) {
        const row = content.rows[i]
        if (!isObject(row)) {
          errors.push(`Page ${index}, row ${i}: must be an object`)
        } else if (typeof row.leftTitle !== 'string' || typeof row.leftBody !== 'string') {
          errors.push(`Page ${index}, row ${i}: requires "leftTitle" and "leftBody" strings`)
        }
      }
    }
  }

  if (type === 'academic') {
    if (!Array.isArray(content.entries)) {
      errors.push(`Page ${index}: academic page requires "content.entries" array`)
    } else {
      for (let i = 0; i < content.entries.length; i++) {
        const entry = content.entries[i]
        if (!isObject(entry)) {
          errors.push(`Page ${index}, entry ${i}: must be an object`)
        } else {
          for (const field of ['name', 'award', 'category', 'gradeLevel']) {
            if (typeof entry[field] !== 'string') {
              errors.push(`Page ${index}, entry ${i}: requires "${field}" string`)
            }
          }
        }
      }
    }
  }

  if (type === 'non-academic') {
    if (!Array.isArray(content.entries)) {
      errors.push(`Page ${index}: non-academic page requires "content.entries" array`)
    } else {
      for (let i = 0; i < content.entries.length; i++) {
        const entry = content.entries[i]
        if (!isObject(entry)) {
          errors.push(`Page ${index}, entry ${i}: must be an object`)
        } else {
          for (const field of ['name', 'award', 'category']) {
            if (typeof entry[field] !== 'string') {
              errors.push(`Page ${index}, entry ${i}: requires "${field}" string`)
            }
          }
        }
      }
    }
  }

  if (type === 'core') {
    if (!Array.isArray(content.sections)) {
      errors.push(`Page ${index}: core page requires "content.sections" array`)
    } else {
      for (let i = 0; i < content.sections.length; i++) {
        const section = content.sections[i]
        if (!isObject(section)) {
          errors.push(`Page ${index}, section ${i}: must be an object`)
        } else if (typeof section.title !== 'string' || typeof section.body !== 'string') {
          errors.push(`Page ${index}, section ${i}: requires "title" and "body" strings`)
        } else if (
          section.flowPosition !== undefined &&
          !isValidFlowPosition(section.flowPosition)
        ) {
          errors.push(`Page ${index}, section ${i}: "flowPosition" must be a non-negative number when provided`)
        }
      }
    }
  }

  return errors
}

export type ValidationResult =
  | { valid: true; data: BookletExport }
  | { valid: false; errors: string[] }

export function validateBookletImport(raw: unknown): ValidationResult {
  const errors: string[] = []

  if (!isObject(raw)) {
    return { valid: false, errors: ['Input must be a JSON object'] }
  }

  if (raw.version !== 1) {
    errors.push(`Unsupported version "${String(raw.version)}" (expected 1)`)
  }

  if (!Array.isArray(raw.pages)) {
    return { valid: false, errors: [...errors, '"pages" must be an array'] }
  }

  if (raw.pages.length === 0) {
    errors.push('"pages" array is empty')
  }

  for (let i = 0; i < raw.pages.length; i++) {
    const page = raw.pages[i]
    if (!isObject(page)) {
      errors.push(`Page ${i}: must be an object`)
      continue
    }
    if (typeof page.type !== 'string' || !VALID_TYPES.has(page.type)) {
      errors.push(`Page ${i}: "type" must be one of: ${[...VALID_TYPES].join(', ')}`)
      continue
    }
    if (typeof page.title !== 'string' || page.title.trim() === '') {
      errors.push(`Page ${i}: "title" is required`)
    }
    errors.push(...validatePageContent(page, i))
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // Normalize: ensure IDs exist, re-index order
  const normalizedPages: CmsPage[] = raw.pages.map((p: Record<string, unknown>, i: number) => {
    const page = p as unknown as CmsPage
    const id = typeof page.id === 'string' && page.id.length > 0 ? page.id : crypto.randomUUID()

    // Ensure child items have IDs
    if (page.type === 'program') {
      const rows = (page.content.rows as ProgramRow[]).map((row) => ({
        ...row,
        id: row.id || crypto.randomUUID(),
      }))
      return { ...page, id, order: i, content: { ...page.content, rows } }
    }
    if (page.type === 'academic') {
      const entries = (page.content.entries as AcademicEntry[]).map((entry) => ({
        ...entry,
        id: entry.id || crypto.randomUUID(),
      }))
      return { ...page, id, order: i, content: { ...page.content, entries } }
    }
    if (page.type === 'non-academic') {
      const entries = (page.content.entries as NonAcademicEntry[]).map((entry) => ({
        ...entry,
        id: entry.id || crypto.randomUUID(),
      }))
      return { ...page, id, order: i, content: { ...page.content, entries } }
    }
    // core
    const sections = ((page as { content: { sections: CoreSection[] } }).content.sections).map((section) => ({
      ...section,
      id: section.id || crypto.randomUUID(),
      flowPosition: normalizeFlowPosition(section.flowPosition),
    }))
    return { ...page, id, order: i, content: { ...page.content, sections } } as CmsPage
  })

  const normalizedSettings: CmsSettings | undefined = isObject(raw.settings)
    ? { ...defaultSettings, ...(raw.settings as Partial<CmsSettings>) }
    : undefined

  const frontCover = typeof raw.frontCover === 'string' ? raw.frontCover : null
  const backCover = typeof raw.backCover === 'string' ? raw.backCover : null

  return {
    valid: true,
    data: {
      version: 1,
      title: typeof raw.title === 'string' ? raw.title : 'Imported Booklet',
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
      pages: normalizedPages,
      settings: normalizedSettings,
      frontCover,
      backCover,
    },
  }
}

/* ── Import preparation ───────────────────────────────────── */

export function prepareImportPages(
  importData: BookletExport,
  existingPages: CmsPage[],
  mode: 'replace' | 'merge',
): CmsPage[] {
  if (mode === 'replace') {
    return importData.pages.map((page, index) => ({ ...page, order: index }))
  }

  // Merge: append after existing pages
  const offset = existingPages.length
  const importedPages = importData.pages.map((page, index) => ({
    ...page,
    id: crypto.randomUUID(), // new IDs to avoid conflicts
    order: offset + index,
  }))

  return [...existingPages, ...importedPages]
}

/* ── Import summary ───────────────────────────────────────── */

export function getImportSummary(pages: CmsPage[]): string {
  const counts: Record<string, number> = {}
  for (const page of pages) {
    counts[page.type] = (counts[page.type] || 0) + 1
  }
  const details = Object.entries(counts)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ')
  return `Imported ${pages.length} page${pages.length !== 1 ? 's' : ''} (${details})`
}

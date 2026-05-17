import { defaultSettings, seedPages } from '@/lib/sample-data'
import { migratePages } from '@/lib/storage-migrations'
import { clearLegacyLocalStorage, hasLegacyLocalStorage, readLegacyLocalStorage } from '@/lib/storage-local'
import { getSupabaseClient, type CmsDocumentRow } from '@/lib/supabase'
import type { CmsPage, CmsSettings } from '@/types/cms'
import { CMS_DOCUMENT_SLUG, type CmsState } from '@/types/cms-state'

export type { CmsState } from '@/types/cms-state'

function sortPages(pages: CmsPage[]): CmsPage[] {
  return [...pages].sort((left, right) => left.order - right.order)
}

function createSeedState(): CmsState {
  return {
    pages: sortPages(seedPages),
    settings: { ...defaultSettings },
    documentTitle: 'College Recognition Program',
    frontCover: null,
    backCover: null,
  }
}

function rowToState(row: CmsDocumentRow): CmsState {
  const pages = Array.isArray(row.pages) ? (row.pages as CmsPage[]) : []
  const settings = {
    ...defaultSettings,
    ...(row.settings && typeof row.settings === 'object' ? (row.settings as CmsSettings) : {}),
  }

  return {
    pages: migratePages(pages),
    settings,
    documentTitle: row.document_title || 'College Recognition Program',
    frontCover: row.front_cover,
    backCover: row.back_cover,
  }
}

function stateToRow(state: CmsState): Omit<CmsDocumentRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    slug: CMS_DOCUMENT_SLUG,
    document_title: state.documentTitle,
    pages: migratePages(state.pages),
    settings: state.settings,
    front_cover: state.frontCover,
    back_cover: state.backCover,
  }
}

async function fetchDocumentRow(): Promise<CmsDocumentRow | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('cms_documents')
    .select('*')
    .eq('slug', CMS_DOCUMENT_SLUG)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as CmsDocumentRow | null
}

async function upsertDocumentState(state: CmsState): Promise<CmsState> {
  const supabase = getSupabaseClient()
  const payload = {
    ...stateToRow(state),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('cms_documents')
    .upsert(payload, { onConflict: 'slug' })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return rowToState(data as CmsDocumentRow)
}

async function resolveInitialState(): Promise<CmsState> {
  const existing = await fetchDocumentRow()
  if (existing) {
    const pages = Array.isArray(existing.pages) ? (existing.pages as CmsPage[]) : []
    if (pages.length > 0) {
      const state = rowToState(existing)
      const migrated = migratePages(state.pages)
      if (JSON.stringify(migrated) !== JSON.stringify(state.pages)) {
        return upsertDocumentState({ ...state, pages: migrated })
      }
      return state
    }
  }

  if (hasLegacyLocalStorage()) {
    const legacy = readLegacyLocalStorage()
    if (legacy) {
      const migrated: CmsState = {
        ...legacy,
        pages: migratePages(legacy.pages),
        settings: { ...defaultSettings, ...legacy.settings },
      }
      const saved = await upsertDocumentState(migrated)
      clearLegacyLocalStorage()
      return saved
    }
  }

  return upsertDocumentState(createSeedState())
}

export async function loadCmsState(): Promise<CmsState> {
  return resolveInitialState()
}

export async function saveCmsState(state: CmsState): Promise<CmsState> {
  return upsertDocumentState({
    ...state,
    pages: sortPages(state.pages),
    settings: { ...defaultSettings, ...state.settings },
  })
}

export async function savePages(pages: CmsPage[], current: CmsState): Promise<CmsPage[]> {
  const saved = await saveCmsState({ ...current, pages: sortPages(pages) })
  return saved.pages
}

export async function deletePage(pageId: string, current: CmsState): Promise<CmsPage[]> {
  const nextPages = current.pages.filter((page) => page.id !== pageId)
  const saved = await saveCmsState({ ...current, pages: nextPages })
  return saved.pages
}

export async function saveSettings(settings: CmsSettings, current: CmsState): Promise<CmsSettings> {
  const saved = await saveCmsState({ ...current, settings })
  return saved.settings
}

export async function saveDocumentTitle(documentTitle: string, current: CmsState): Promise<string> {
  const saved = await saveCmsState({ ...current, documentTitle })
  return saved.documentTitle
}

export async function saveFrontCover(frontCover: string | null, current: CmsState): Promise<string | null> {
  const saved = await saveCmsState({ ...current, frontCover })
  return saved.frontCover
}

export async function saveBackCover(backCover: string | null, current: CmsState): Promise<string | null> {
  const saved = await saveCmsState({ ...current, backCover })
  return saved.backCover
}

export async function resetCmsDocument(): Promise<CmsState> {
  clearLegacyLocalStorage()
  return upsertDocumentState(createSeedState())
}

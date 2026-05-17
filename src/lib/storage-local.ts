import { defaultSettings } from '@/lib/sample-data'
import type { CmsPage, CmsSettings } from '@/types/cms'
import type { CmsState } from '@/types/cms-state'

const PAGES_KEY = 'cms_v1_pages'
const SETTINGS_KEY = 'cms_v1_settings'
const FRONT_COVER_KEY = 'cms_v1_front_cover'
const BACK_COVER_KEY = 'cms_v1_back_cover'
const DOCUMENT_TITLE_KEY = 'cms_v1_document_title'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback
  }

  const rawValue = window.localStorage.getItem(key)
  if (!rawValue) {
    return fallback
  }

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return fallback
  }
}

export function hasLegacyLocalStorage(): boolean {
  if (!canUseStorage()) {
    return false
  }
  return Boolean(window.localStorage.getItem(PAGES_KEY))
}

export function readLegacyLocalStorage(): CmsState | null {
  if (!hasLegacyLocalStorage()) {
    return null
  }

  const pages = readJson<CmsPage[]>(PAGES_KEY, [])
  if (pages.length === 0) {
    return null
  }

  const settings = readJson<CmsSettings>(SETTINGS_KEY, defaultSettings)
  const documentTitle =
    window.localStorage.getItem(DOCUMENT_TITLE_KEY) ?? 'College Recognition Program'
  const frontCover = window.localStorage.getItem(FRONT_COVER_KEY)
  const backCover = window.localStorage.getItem(BACK_COVER_KEY)

  return {
    pages,
    settings: { ...defaultSettings, ...settings },
    documentTitle,
    frontCover,
    backCover,
  }
}

export function clearLegacyLocalStorage(): void {
  if (!canUseStorage()) {
    return
  }
  window.localStorage.removeItem(PAGES_KEY)
  window.localStorage.removeItem(SETTINGS_KEY)
  window.localStorage.removeItem(FRONT_COVER_KEY)
  window.localStorage.removeItem(BACK_COVER_KEY)
  window.localStorage.removeItem(DOCUMENT_TITLE_KEY)
}

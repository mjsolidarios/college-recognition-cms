import { defaultSettings, seedPages } from '@/lib/sample-data'
import type { CmsPage, CmsSettings } from '@/types/cms'

const PAGES_KEY = 'cms_v1_pages'
const SETTINGS_KEY = 'cms_v1_settings'

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

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

export function getPages(): CmsPage[] {
  // TODO: replace with Supabase.
  const pages = readJson<CmsPage[]>(PAGES_KEY, seedPages)

  if (!canUseStorage() || window.localStorage.getItem(PAGES_KEY)) {
    return [...pages].sort((left, right) => left.order - right.order)
  }

  writeJson(PAGES_KEY, seedPages)
  return [...seedPages]
}

export function savePage(page: CmsPage): CmsPage[] {
  // TODO: replace with Supabase.
  const pages = getPages()
  const existingIndex = pages.findIndex((entry) => entry.id === page.id)

  if (existingIndex >= 0) {
    pages[existingIndex] = page
  } else {
    pages.push(page)
  }

  const nextPages = [...pages].sort((left, right) => left.order - right.order)
  writeJson(PAGES_KEY, nextPages)
  return nextPages
}

export function deletePage(pageId: string): CmsPage[] {
  // TODO: replace with Supabase.
  const nextPages = getPages().filter((page) => page.id !== pageId)
  writeJson(PAGES_KEY, nextPages)
  return nextPages
}

export function getSettings(): CmsSettings {
  // TODO: replace with Supabase.
  const settings = readJson<CmsSettings>(SETTINGS_KEY, defaultSettings)

  if (!canUseStorage() || window.localStorage.getItem(SETTINGS_KEY)) {
    return { ...defaultSettings, ...settings }
  }

  writeJson(SETTINGS_KEY, defaultSettings)
  return { ...defaultSettings }
}

export function saveSettings(settings: CmsSettings): CmsSettings {
  // TODO: replace with Supabase.
  writeJson(SETTINGS_KEY, settings)
  return settings
}

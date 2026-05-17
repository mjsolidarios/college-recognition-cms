import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Download,
  FileImage,
  FileText,
  GripVertical,
  LayoutGrid,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { CanvasPreview } from '@/components/canvas-preview'
import { ExportDialog, ImportDialog } from '@/components/import-export-dialog'
import { PageEditor } from '@/components/page-editor'
import { PageList } from '@/components/page-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FONT_OPTIONS } from '@/lib/fonts'
import { exportPdfDocument, exportSvgDocument, warmPdfExportWorker } from '@/lib/exporters'
import {
  applyPageLayoutFlowMap,
  pageContainsLayoutItem,
  repositionLayoutItemWithReflow,
  type LayoutItemFlowReflowCommand,
} from '@/lib/layout-item-flow'
import { previewSlotIndexForLayoutItem, previewSlotIndexForPageId } from '@/lib/preview-navigation'
import { renderDocument } from '@/lib/layout'
import { defaultSettings, seedPages } from '@/lib/sample-data'
import { deletePage, getPages, getSettings, savePage, saveSettings, getFrontCover, saveFrontCover, getBackCover, saveBackCover } from '@/lib/storage'
import { progressPercent, type PdfExportProgress } from '@/lib/pdf-worker-protocol'
import type { CmsPage, CmsSettings, FontPreset, PageType } from '@/types/cms'
import { PAGE_WIDTH, PAGE_HEIGHT } from '@/types/cms'

const PAGE_LABELS: Record<PageType, string> = {
  core: 'Core Page',
  program: 'Program',
  academic: 'Academic Awards',
  'non-academic': 'Non-Academic Awards',
}

type MobileTab = 'pages' | 'canvas' | 'editor'

function createBlankPage(pageType: PageType, order: number): CmsPage {
  switch (pageType) {
    case 'program':
      return {
        id: crypto.randomUUID(),
        order,
        type: 'program',
        title: PAGE_LABELS[pageType],
        content: {
          heading: 'PROGRAM',
          rows: [
            {
              id: crypto.randomUUID(),
              leftTitle: 'Opening number',
              leftBody: 'Describe the opening sequence.',
              rightTitle: 'Support details',
              rightBody: 'Use this column for presenters, awarders, or notes.',
            },
          ],
        },
      }
    case 'academic':
      return {
        id: crypto.randomUUID(),
        order,
        type: 'academic',
        title: PAGE_LABELS[pageType],
        content: {
          heading: 'ACADEMIC AWARDEES',
          entries: [
            {
              id: crypto.randomUUID(),
              name: 'New awardee',
              award: 'Bachelor of Science in Information Technology',
              category: 'Gold Medals',
              gradeLevel: '4th Year Curriculum',
            },
          ],
        },
      }
    case 'non-academic':
      return {
        id: crypto.randomUUID(),
        order,
        type: 'non-academic',
        title: PAGE_LABELS[pageType],
        content: {
          heading: 'NON-ACADEMIC AWARDEES',
          entries: [
            {
              id: crypto.randomUUID(),
              name: 'New awardee',
              award: 'Leadership Award',
              category: 'Individual Honors',
            },
          ],
        },
      }
    case 'core':
      return {
        id: crypto.randomUUID(),
        order,
        type: 'core',
        title: PAGE_LABELS[pageType],
        content: {
          heading: 'COLLEGE RECOGNITION PROGRAM',
          subheading: 'Welcome message or general content',
          sections: [
            {
              id: crypto.randomUUID(),
              title: 'Section title',
              body: 'Write the section body here.',
            },
          ],
        },
      }
  }
}

function reorderPages(pages: CmsPage[], activeId: string, overId: string) {
  const orderedPages = [...pages].sort((left, right) => left.order - right.order)
  const activeIndex = orderedPages.findIndex((page) => page.id === activeId)
  const overIndex = orderedPages.findIndex((page) => page.id === overId)

  if (activeIndex < 0 || overIndex < 0) {
    return orderedPages
  }

  const [activePage] = orderedPages.splice(activeIndex, 1)
  orderedPages.splice(overIndex, 0, activePage)

  return orderedPages.map((page, index) => ({ ...page, order: index }))
}

/* ── Settings panel sub-components ───────────────────────── */

function SettingsGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-[var(--color-hairline)] bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 text-left cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">{title}</span>
        <ChevronDown className={`size-3.5 text-[var(--color-muted-soft)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="animate-fade-in space-y-3 border-t border-[var(--color-hairline-soft)] px-3 pb-3 pt-2">
          {children}
        </div>
      )}
    </div>
  )
}

function SliderSetting({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-medium text-[var(--color-body)]">{label}</label>
        <span className="rounded bg-[var(--surface-canvas)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--color-primary)]">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </div>
  )
}

/* ── Main App ────────────────────────────────────────────── */

const MIN_EDITOR_WIDTH = 280
const MAX_EDITOR_WIDTH = 560
const DEFAULT_EDITOR_WIDTH = 360
const DISPLAY_ITEM_ID_LENGTH = 8
/** Wait two animation frames: one for React to commit, one for the browser to paint the exporting state. */
const waitForUiUpdate = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

function App() {
  const [pages, setPages] = useState<CmsPage[]>(() => getPages())
  const [settings, setSettings] = useState<CmsSettings>(() => getSettings())
  const [activePageId, setActivePageId] = useState(() => getPages()[0]?.id ?? '')
  const [documentTitle, setDocumentTitle] = useState('College Recognition Program')
  const [frontCover, setFrontCover] = useState<string | null>(() => getFrontCover())
  const [backCover, setBackCover] = useState<string | null>(() => getBackCover())
  const [isExporting, setIsExporting] = useState(false)
  const [pdfExportProgress, setPdfExportProgress] = useState<PdfExportProgress | null>(null)
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas')
  const [editorWidth, setEditorWidth] = useState(DEFAULT_EDITOR_WIDTH)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const [previewPageIndex, setPreviewPageIndex] = useState(0)
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null)
  const [layoutFlowUndo, setLayoutFlowUndo] = useState<LayoutItemFlowReflowCommand[]>([])
  const [layoutFlowRedo, setLayoutFlowRedo] = useState<LayoutItemFlowReflowCommand[]>([])
  const [focusedLayoutItemId, setFocusedLayoutItemId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved'>('saved')
  const pagesRef = useRef(pages)
  const saveStatusTimeoutRef = useRef<number | null>(null)
  pagesRef.current = pages

  const activePage = useMemo(
    () => pages.find((page) => page.id === activePageId) ?? pages[0],
    [activePageId, pages],
  )

  const renderedPages = useMemo(() => renderDocument(pages, settings), [pages, settings])
  const previewSlotCount = renderedPages.length + (frontCover ? 1 : 0) + (backCover ? 1 : 0)
  const safePreviewPageIndex = Math.min(previewPageIndex, Math.max(0, previewSlotCount - 1))

  useEffect(() => {
    warmPdfExportWorker()
  }, [])

  useEffect(
    () => () => {
      if (saveStatusTimeoutRef.current !== null) {
        window.clearTimeout(saveStatusTimeoutRef.current)
      }
    },
    [],
  )

  const pulseSavedStatus = useCallback(() => {
    setSaveStatus('saving')
    if (saveStatusTimeoutRef.current !== null) {
      window.clearTimeout(saveStatusTimeoutRef.current)
    }
    saveStatusTimeoutRef.current = window.setTimeout(() => {
      setSaveStatus('saved')
    }, 260)
  }, [])

  useEffect(() => {
    if (!activePage || !focusedLayoutItemId || !pageContainsLayoutItem(activePage, focusedLayoutItemId)) {
      setFocusedLayoutItemId(null)
    }
  }, [activePage, focusedLayoutItemId])

  const focusedLayoutItem = useMemo(() => {
    if (!activePage || !focusedLayoutItemId || !pageContainsLayoutItem(activePage, focusedLayoutItemId)) {
      return null
    }
    return { pageId: activePage.id, itemId: focusedLayoutItemId }
  }, [activePage, focusedLayoutItemId])

  const persistPages = (nextPages: CmsPage[]) => {
    pulseSavedStatus()
    const orderedPages = [...nextPages].sort((left, right) => left.order - right.order)
    let persistedPages = orderedPages
    orderedPages.forEach((page) => {
      persistedPages = savePage(page)
    })
    setPages(persistedPages)
    setActivePageId((current) => current || persistedPages[0]?.id || '')
  }

  const handlePageChange = (page: CmsPage) => {
    const nextPages = pages.map((entry) => (entry.id === page.id ? page : entry))
    persistPages(nextPages)
  }

  const clearLayoutFlowHistory = useCallback(() => {
    setLayoutFlowUndo([])
    setLayoutFlowRedo([])
  }, [])

  const handleLayoutItemReposition = (pageId: string, itemId: string, flowPosition: number) => {
    const result = repositionLayoutItemWithReflow(
      pagesRef.current,
      pageId,
      itemId,
      flowPosition,
      settings,
    )
    if (!result) {
      return
    }
    setLayoutFlowUndo((stack) => [
      ...stack,
      { pageId, movedItemId: itemId, before: result.before, after: result.after },
    ])
    setLayoutFlowRedo([])
    persistPages(result.pages)
  }

  const handleUndoLayoutFlow = useCallback(() => {
    setLayoutFlowUndo((stack) => {
      if (stack.length === 0) {
        return stack
      }
      const cmd = stack[stack.length - 1]!
      setLayoutFlowRedo((redo) => [...redo, cmd])
      persistPages(applyPageLayoutFlowMap(pagesRef.current, cmd.pageId, cmd.before))
      return stack.slice(0, -1)
    })
  }, [])

  const handleRedoLayoutFlow = useCallback(() => {
    setLayoutFlowRedo((stack) => {
      if (stack.length === 0) {
        return stack
      }
      const cmd = stack[stack.length - 1]!
      setLayoutFlowUndo((undo) => [...undo, cmd])
      persistPages(applyPageLayoutFlowMap(pagesRef.current, cmd.pageId, cmd.after))
      return stack.slice(0, -1)
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return
      }
      const mod = event.metaKey || event.ctrlKey
      if (!mod) {
        return
      }
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        handleUndoLayoutFlow()
        return
      }
      if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
        event.preventDefault()
        handleRedoLayoutFlow()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleRedoLayoutFlow, handleUndoLayoutFlow])

  const handleAddPage = (pageType: PageType) => {
    const page = createBlankPage(pageType, pages.length)
    persistPages([...pages, page])
    setActivePageId(page.id)
  }

  const handleDeletePage = (pageId: string) => {
    if (pages.length <= 1) {
      window.alert('At least one page is required. Add a new page before deleting this one.')
      return
    }
    const page = pages.find((entry) => entry.id === pageId)
    const ok = window.confirm(`Delete "${page?.title ?? 'this page'}"? This action cannot be undone.`)
    if (!ok) {
      return
    }
    const nextPages = deletePage(pageId).map((page, index) => ({ ...page, order: index }))
    persistPages(nextPages)
    setActivePageId((current) => (current === pageId ? nextPages[0]?.id ?? '' : current))
  }

  const handleReorder = (activeId: string, overId: string) => {
    persistPages(reorderPages(pages, activeId, overId))
  }

  const syncPreviewToPage = useCallback(
    (pageId: string) => {
      const index = previewSlotIndexForPageId(renderedPages, pageId, { hasFrontCover: Boolean(frontCover) })
      if (index !== null) {
        setPreviewPageIndex(index)
      }
    },
    [renderedPages, frontCover],
  )

  const handleSelectPage = useCallback(
    (pageId: string) => {
      setActivePageId(pageId)
      setFocusedLayoutItemId(null)
      syncPreviewToPage(pageId)
    },
    [syncPreviewToPage],
  )

  const handleLayoutItemSelect = useCallback(
    (itemId: string) => {
      if (!activePage || !pageContainsLayoutItem(activePage, itemId)) {
        return
      }
      setFocusedLayoutItemId(itemId)
      const index = previewSlotIndexForLayoutItem(renderedPages, activePage.id, itemId, {
        hasFrontCover: Boolean(frontCover),
      })
      if (index !== null) {
        setPreviewPageIndex(index)
      }
    },
    [activePage, frontCover, renderedPages],
  )

  const updateSetting = <K extends keyof CmsSettings>(key: K, value: CmsSettings[K]) => {
    pulseSavedStatus()
    const nextSettings = { ...settings, [key]: value }
    setSettings(saveSettings(nextSettings))
  }

  const handleResetSettings = () => {
    const ok = window.confirm('Reset all settings to defaults? Page content and title will not be changed.')
    if (!ok) {
      return
    }
    pulseSavedStatus()
    const next = { ...defaultSettings }
    setSettings(saveSettings(next))
  }

  const handleReset = () => {
    const ok = window.confirm('Reset the entire document to seed content? This removes custom pages, settings, and covers.')
    if (!ok) {
      return
    }
    pulseSavedStatus()
    clearLayoutFlowHistory()
    pages.forEach((page) => {
      deletePage(page.id)
    })
    persistPages(seedPages)
    setSettings(saveSettings(defaultSettings))
    setActivePageId(seedPages[0].id)
    setPreviewPageIndex(0)
    saveFrontCover(null)
    setFrontCover(null)
    saveBackCover(null)
    setBackCover(null)
  }

  const handleExportPdf = async () => {
    const coverCount = (frontCover ? 1 : 0) + (backCover ? 1 : 0)
    const total = renderedPages.length + coverCount
    setIsExporting(true)
    setPdfExportProgress({
      phase: 'prepare',
      current: 0,
      total,
      message: 'Starting export…',
    })
    try {
      await waitForUiUpdate()
      await exportPdfDocument(renderedPages, documentTitle, setPdfExportProgress, frontCover, backCover)
    } finally {
      setIsExporting(false)
      setPdfExportProgress(null)
    }
  }

  const handleExportSvg = () => {
    const page = renderedPages[safePreviewPageIndex]
    if (!page) {
      return
    }
    exportSvgDocument([page], documentTitle, frontCover, backCover)
  }

  const handleImport = (importedPages: CmsPage[], importedSettings?: CmsSettings, importedTitle?: string, importedFrontCover?: string | null, importedBackCover?: string | null) => {
    pulseSavedStatus()
    // Clear existing pages from storage first
    pages.forEach((page) => deletePage(page.id))
    persistPages(importedPages)
    if (importedSettings) {
      setSettings(saveSettings(importedSettings))
    }
    if (importedTitle) {
      setDocumentTitle(importedTitle)
    }
    if (importedFrontCover !== undefined) {
      saveFrontCover(importedFrontCover)
      setFrontCover(importedFrontCover)
    }
    if (importedBackCover !== undefined) {
      saveBackCover(importedBackCover)
      setBackCover(importedBackCover)
    }
    setActivePageId(importedPages[0]?.id ?? '')
    setPreviewPageIndex(0)
  }

  /* ── Resize drag handle ─────────────────────────────────── */
  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startWidth: editorWidth }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = dragRef.current.startX - ev.clientX
      setEditorWidth(Math.max(MIN_EDITOR_WIDTH, Math.min(MAX_EDITOR_WIDTH, dragRef.current.startWidth + delta)))
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [editorWidth])

  /* ── Mobile page-list callbacks ────────────────────────── */
  const handleMobileSelect = useCallback(
    (pageId: string) => {
      setActivePageId(pageId)
      syncPreviewToPage(pageId)
      setMobileTab('canvas')
    },
    [syncPreviewToPage],
  )

  const handleMobileAdd = useCallback((type: PageType) => {
    handleAddPage(type)
    setMobileTab('canvas')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Cover upload helper ────────────────────────────────── */
  const coverFileRef = useRef<{ front: HTMLInputElement | null; back: HTMLInputElement | null }>({ front: null, back: null })

  const loadCoverFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = PAGE_WIDTH
        canvas.height = PAGE_HEIGHT
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
        ctx.drawImage(img, 0, 0, PAGE_WIDTH, PAGE_HEIGHT)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
      img.src = url
    })

  const handleCoverUpload = async (which: 'front' | 'back', file: File) => {
    pulseSavedStatus()
    setCoverUploadError(null)
    try {
      const dataUrl = await loadCoverFile(file)
      if (which === 'front') {
        saveFrontCover(dataUrl)
        setFrontCover(dataUrl)
      } else {
        saveBackCover(dataUrl)
        setBackCover(dataUrl)
      }
    } catch {
      setCoverUploadError('Failed to load the image. Please try a different file.')
    }
  }

  const handleCoverClear = (which: 'front' | 'back') => {
    pulseSavedStatus()
    if (which === 'front') {
      saveFrontCover(null)
      setFrontCover(null)
    } else {
      saveBackCover(null)
      setBackCover(null)
    }
  }

  /* ── Shared editor/settings panel ──────────────────────── */
  const EditorSettingsPanel = (
    <Tabs defaultValue="editor" className="min-h-0 flex flex-col h-full">
      <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
        <TabsTrigger value="editor">Editor</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="editor" className="min-h-0 flex-1">
        <ScrollArea className="h-[calc(100vh-14rem)] xl:h-[calc(100vh-11rem)]">
          {activePage ? (
            <PageEditor
              page={activePage}
              onChange={handlePageChange}
              selectedLayoutItemId={focusedLayoutItemId}
              onLayoutItemSelect={handleLayoutItemSelect}
            />
          ) : null}
        </ScrollArea>
      </TabsContent>
      <TabsContent value="settings" className="min-h-0 flex-1">
        <ScrollArea className="h-[calc(100vh-14rem)] xl:h-[calc(100vh-11rem)]">
          <div className="space-y-3 pb-2">
            <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-hairline)] bg-[var(--surface-canvas)] px-3 py-2.5">
              <p className="text-[11px] leading-snug text-[var(--color-muted)]">
                Restore typography, layout, and display options to their defaults. Pages and document title are unchanged.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-fit border-[var(--color-hairline)] bg-white text-xs text-[var(--color-body)] hover:bg-white hover:text-[var(--color-ink)]"
                onClick={handleResetSettings}
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                Reset settings
              </Button>
            </div>

            {/* Document */}
            <SettingsGroup title="Document">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-body)]">Academic year</label>
                <Input
                  value={settings.documentYear}
                  onChange={(e) => updateSetting('documentYear', e.target.value)}
                  placeholder="e.g. 2024–2025"
                  className="h-10 text-xs"
                />
              </div>
            </SettingsGroup>

            {/* Scale */}
            <SettingsGroup title="Scale">
              <SliderSetting
                label="Global scale"
                value={settings.globalScale}
                min={0.8} max={1.4} step={0.05}
                unit="×"
                onChange={(v) => updateSetting('globalScale', v)}
              />
            </SettingsGroup>

            {/* Typography */}
            <SettingsGroup title="Typography">
              <SliderSetting
                label="Title size"
                value={settings.titleSize}
                min={14} max={28} step={0.5}
                unit="px"
                onChange={(v) => updateSetting('titleSize', v)}
              />
              <SliderSetting
                label="Subtitle size"
                value={settings.subtitleSize}
                min={10} max={18} step={0.5}
                unit="px"
                onChange={(v) => updateSetting('subtitleSize', v)}
              />
              <SliderSetting
                label="Section heading"
                value={settings.headingSize}
                min={10} max={18} step={0.5}
                unit="px"
                onChange={(v) => updateSetting('headingSize', v)}
              />
              <SliderSetting
                label="Body size"
                value={settings.bodySize}
                min={9} max={16} step={0.25}
                unit="px"
                onChange={(v) => updateSetting('bodySize', v)}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-body)]">Heading font</label>
                  <Select value={settings.headingFont} onValueChange={(value) => updateSetting('headingFont', value as FontPreset)}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] leading-snug text-[var(--color-muted)]">
                    {FONT_OPTIONS.find((font) => font.value === settings.headingFont)?.description}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-body)]">Body font</label>
                  <Select value={settings.bodyFont} onValueChange={(value) => updateSetting('bodyFont', value as FontPreset)}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] leading-snug text-[var(--color-muted)]">
                    {FONT_OPTIONS.find((font) => font.value === settings.bodyFont)?.description}
                  </p>
                </div>
              </div>
              <SliderSetting
                label="Meta size"
                value={settings.metaSize}
                min={8} max={14} step={0.25}
                unit="px"
                onChange={(v) => updateSetting('metaSize', v)}
              />
              <SliderSetting
                label="Page number size"
                value={settings.pageNumberSize}
                min={8} max={14} step={0.25}
                unit="px"
                onChange={(v) => updateSetting('pageNumberSize', v)}
              />
              <SliderSetting
                label="Line height"
                value={settings.lineHeight}
                min={1.1} max={1.8} step={0.05}
                unit="×"
                onChange={(v) => updateSetting('lineHeight', v)}
              />
            </SettingsGroup>

            {/* Layout */}
            <SettingsGroup title="Layout">
              <SliderSetting
                label="Top padding"
                value={settings.pagePaddingTop}
                min={24} max={72} step={1}
                unit="px"
                onChange={(v) => updateSetting('pagePaddingTop', v)}
              />
              <SliderSetting
                label="Bottom padding"
                value={settings.pagePaddingBottom}
                min={20} max={72} step={1}
                unit="px"
                onChange={(v) => updateSetting('pagePaddingBottom', v)}
              />
              <SliderSetting
                label="Side padding"
                value={settings.pagePaddingX}
                min={24} max={72} step={1}
                unit="px"
                onChange={(v) => updateSetting('pagePaddingX', v)}
              />
              <SliderSetting
                label="Column gap"
                value={settings.columnGap}
                min={16} max={48} step={1}
                unit="px"
                onChange={(v) => updateSetting('columnGap', v)}
              />
            </SettingsGroup>

            {/* Display */}
            <SettingsGroup title="Display">
              <label className="flex items-center justify-between gap-3 rounded-lg py-1 text-xs font-medium text-[var(--color-body)]">
                Show page numbers
                <span className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.showPageNumbers}
                    onChange={(event) => updateSetting('showPageNumbers', event.target.checked)}
                  />
                  <span className="toggle-track" />
                </span>
              </label>
            </SettingsGroup>

            {/* Covers */}
            <SettingsGroup title="Covers" defaultOpen={false}>
              <p className="text-[11px] leading-snug text-[var(--color-muted)]">
                Upload a front and/or back cover image (PNG, JPG, or SVG). Covers are scaled to fit the page and included in PDF and SVG exports.
              </p>
              {coverUploadError && (
                <p className="text-[11px] font-medium text-red-600">{coverUploadError}</p>
              )}
              {/* Front cover */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-body)]">Front cover</label>
                {frontCover ? (
                  <div className="relative overflow-hidden rounded-md border border-[var(--color-hairline)] bg-[var(--surface-canvas)]">
                    <img src={frontCover} alt="Front cover preview" className="w-full object-contain" style={{ maxHeight: 120 }} />
                    <button
                      type="button"
                      onClick={() => handleCoverClear('front')}
                      className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-white/90 text-[var(--color-muted)] shadow-sm hover:text-red-600 cursor-pointer"
                      title="Remove front cover"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => coverFileRef.current.front?.click()}
                    className="cover-upload-btn"
                  >
                    <FileImage className="size-4" />Upload front cover
                  </button>
                )}
                <input
                  ref={(el) => { coverFileRef.current.front = el }}
                  type="file"
                  accept="image/*,.svg"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { void handleCoverUpload('front', f) } e.target.value = '' }}
                />
              </div>
              {/* Back cover */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-body)]">Back cover</label>
                {backCover ? (
                  <div className="relative overflow-hidden rounded-md border border-[var(--color-hairline)] bg-[var(--surface-canvas)]">
                    <img src={backCover} alt="Back cover preview" className="w-full object-contain" style={{ maxHeight: 120 }} />
                    <button
                      type="button"
                      onClick={() => handleCoverClear('back')}
                      className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-white/90 text-[var(--color-muted)] shadow-sm hover:text-red-600 cursor-pointer"
                      title="Remove back cover"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => coverFileRef.current.back?.click()}
                    className="cover-upload-btn"
                  >
                    <FileImage className="size-4" />Upload back cover
                  </button>
                )}
                <input
                  ref={(el) => { coverFileRef.current.back = el }}
                  type="file"
                  accept="image/*,.svg"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { void handleCoverUpload('back', f) } e.target.value = '' }}
                />
              </div>
            </SettingsGroup>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )

  return (
    <div className="min-h-screen bg-[var(--surface-app)] text-[var(--color-ink)]">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-3 px-3 py-3 xl:px-5">

        {/* ── Header ──────────────────────────────────────── */}
        <header className="rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">

            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--color-hairline)] bg-[var(--surface-canvas)]">
                <BookOpen className="size-4.5 text-[var(--color-primary)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold tracking-tight text-[var(--color-ink)]">Parangal Builder</h1>
                  {settings.documentYear && (
                    <span className="rounded-full border border-[var(--color-hairline-strong)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink)]">
                      {settings.documentYear}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--color-muted)]">College Recognition CMS</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Document title */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-soft)]">Document</span>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-muted)]" />
                  <input
                    value={documentTitle}
                    onChange={(event) => setDocumentTitle(event.target.value)}
                    className="h-10 w-48 rounded-md border border-[var(--color-hairline)] bg-[var(--surface-canvas)] pl-9 pr-3 text-xs text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)] sm:w-56"
                    placeholder="Document title"
                    aria-label="Document title"
                  />
                </div>
              </div>

              <div className="hidden h-9 w-px bg-[var(--color-hairline)] sm:block" />

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-soft)]">File</span>
                <div className="flex flex-wrap items-center gap-2">
                  <ImportDialog pages={pages} onImport={handleImport} />
                  <ExportDialog pages={pages} settings={settings} title={documentTitle} frontCover={frontCover} backCover={backCover} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-soft)]">Export</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 border border-[var(--color-hairline)] bg-white px-3 text-xs text-[var(--color-body)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--surface-canvas)] hover:text-[var(--color-ink)]"
                    onClick={handleExportSvg}
                  >
                    <FileImage className="size-3.5" />
                    <span className="hidden sm:inline">SVG</span>
                  </Button>
                  <div className="flex min-w-[7.5rem] flex-col items-stretch gap-1">
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 px-3 text-xs"
                      onClick={handleExportPdf}
                      disabled={isExporting || renderedPages.length === 0}
                    >
                      {isExporting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                      <span className="max-w-[9rem] truncate">
                        {isExporting ? (pdfExportProgress?.message ?? 'Exporting…') : 'Export PDF'}
                      </span>
                    </Button>
                    {isExporting && pdfExportProgress ? (
                      <div
                        className="h-1 overflow-hidden rounded-full bg-[var(--surface-strong)]"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progressPercent(pdfExportProgress)}
                        aria-label={pdfExportProgress.message}
                      >
                        <div
                          className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300 ease-out"
                          style={{ width: `${progressPercent(pdfExportProgress)}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-soft)]">Reset</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 border border-[var(--color-hairline)] bg-white px-3 text-xs text-[var(--color-body)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--surface-canvas)] hover:text-[var(--color-ink)]"
                  onClick={handleReset}
                >
                  <RefreshCw className="size-3.5" />
                  <span className="hidden sm:inline">Reset document</span>
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-hairline-soft)] pt-2">
            <span className="rounded-full bg-[var(--surface-canvas)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
              Active: {activePage?.title ?? 'No page'} · {activePage ? PAGE_LABELS[activePage.type] : '—'}
            </span>
            <span className="rounded-full bg-[var(--surface-canvas)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
              Selection: {focusedLayoutItemId ? `Item ${focusedLayoutItemId.slice(0, DISPLAY_ITEM_ID_LENGTH)}` : 'None'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-canvas)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
              <CheckCircle2 className="size-3" />
              {saveStatus === 'saving' ? 'Saving content…' : 'Content saved locally'}
            </span>
          </div>
        </header>

        {/* ── Mobile tab bar ──────────────────────────────── */}
        <div className="flex rounded-lg border border-[var(--color-hairline)] bg-white p-1 xl:hidden">
          {(
            [
              { key: 'pages', label: 'Pages', icon: LayoutGrid },
              { key: 'canvas', label: 'Canvas', icon: BookOpen },
              { key: 'editor', label: 'Editor', icon: Pencil },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMobileTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors ${
                mobileTab === key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-muted)] hover:bg-[var(--surface-canvas)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Main grid – desktop ──────────────────────────── */}
        <div
          className="hidden min-h-0 flex-1 gap-3 xl:flex"
          style={{ minHeight: 'calc(100vh - 9rem)' }}
        >
          {/* Page list */}
          <div className="w-[280px] flex-shrink-0">
            <PageList
              pages={pages}
              activePageId={activePage?.id ?? ''}
              onSelect={handleSelectPage}
              onAdd={handleAddPage}
              onDelete={handleDeletePage}
              onReorder={handleReorder}
            />
          </div>

          {/* Canvas */}
          <div className="min-w-0 flex-1">
              <CanvasPreview
                renderedPages={renderedPages}
                previewPageIndex={safePreviewPageIndex}
                onPreviewPageChange={setPreviewPageIndex}
                frontCover={frontCover}
                backCover={backCover}
                onLayoutItemReposition={handleLayoutItemReposition}
                focusedLayoutItem={focusedLayoutItem}
                onLayoutItemSelect={handleLayoutItemSelect}
                onUndoSectionFlow={handleUndoLayoutFlow}
                onRedoSectionFlow={handleRedoLayoutFlow}
                canUndoSectionFlow={layoutFlowUndo.length > 0}
                canRedoSectionFlow={layoutFlowRedo.length > 0}
              />
          </div>

          <div
            className="flex w-2 flex-shrink-0 cursor-col-resize items-center justify-center rounded"
            onMouseDown={handleDragMouseDown}
            title="Drag to resize editor"
          >
            <GripVertical className="size-3.5 text-[var(--color-muted-soft)]" />
          </div>

          {/* Editor / Settings */}
          <div className="flex-shrink-0" style={{ width: editorWidth }}>
            {EditorSettingsPanel}
          </div>
        </div>

        {/* ── Main panels – mobile ────────────────────────── */}
        <div className="min-h-0 flex-1 xl:hidden" style={{ minHeight: 'calc(100vh - 12rem)' }}>
          <div className={mobileTab === 'pages' ? 'block h-full' : 'hidden'}>
            <PageList
              pages={pages}
              activePageId={activePage?.id ?? ''}
              onSelect={handleMobileSelect}
              onAdd={handleMobileAdd}
              onDelete={handleDeletePage}
              onReorder={handleReorder}
            />
          </div>
          <div className={mobileTab === 'canvas' ? 'block h-full' : 'hidden'}>
              <CanvasPreview
                renderedPages={renderedPages}
                previewPageIndex={safePreviewPageIndex}
                onPreviewPageChange={setPreviewPageIndex}
                frontCover={frontCover}
                backCover={backCover}
                onLayoutItemReposition={handleLayoutItemReposition}
                focusedLayoutItem={focusedLayoutItem}
                onLayoutItemSelect={handleLayoutItemSelect}
                onUndoSectionFlow={handleUndoLayoutFlow}
                onRedoSectionFlow={handleRedoLayoutFlow}
                canUndoSectionFlow={layoutFlowUndo.length > 0}
                canRedoSectionFlow={layoutFlowRedo.length > 0}
              />
          </div>
          <div className={mobileTab === 'editor' ? 'block h-full' : 'hidden'}>
            {EditorSettingsPanel}
          </div>
        </div>

      </div>
    </div>
  )
}

export default App

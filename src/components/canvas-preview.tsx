import { ChevronLeft, ChevronRight, CircleHelp, Minus, Plus, Redo2, RotateCcw, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  buildLayoutItemOverlays,
  buildLayoutItemStartFlowMap,
  placementFromFlow,
} from '@/lib/canvas-layout-items'
import { getFontStack } from '@/lib/fonts'
import { FLOW_POSITION_SNAP_INCREMENT, snapFlowPosition } from '@/lib/flow-position'
import { getRenderedBlockLines } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { PAGE_HEIGHT, PAGE_WIDTH, type BorderStyle, type RenderedPage } from '@/types/cms'

const RULER_SIZE = 24
const RULER_FONT = `7.5px 'JetBrains Mono', 'Fira Code', monospace`
const CANVAS_HINTS_HIDDEN_KEY = 'cms_canvas_hints_hidden'

function readHintsHiddenPreference(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return window.localStorage.getItem(CANVAS_HINTS_HIDDEN_KEY) === '1'
}

function persistHintsHiddenPreference(hidden: boolean) {
  if (typeof window === 'undefined') {
    return
  }
  if (hidden) {
    window.localStorage.setItem(CANVAS_HINTS_HIDDEN_KEY, '1')
  } else {
    window.localStorage.removeItem(CANVAS_HINTS_HIDDEN_KEY)
  }
}
function releasePointerCaptureIfHeld(target: EventTarget | null, pointerId: number) {
  if (!(target instanceof Element) || !target.hasPointerCapture(pointerId)) {
    return
  }
  target.releasePointerCapture(pointerId)
}

/** DOM height required to show all precomputed lines for a text block at the current zoom level. */
function getBlockPreviewHeight(block: RenderedPage['blocks'][number], zoom: number) {
  return block.lines.length * block.lineHeight * zoom
}

function HorizontalRuler({ zoom, panX, maxVal }: { zoom: number; panX: number; maxVal: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: RULER_SIZE })

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      setSize({ w: entries[0].contentRect.width, h: RULER_SIZE })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.w === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.style.width = `${size.w}px`
    canvas.style.height = `${RULER_SIZE}px`
    canvas.width = size.w * dpr
    canvas.height = RULER_SIZE * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, size.w, RULER_SIZE)
    ctx.fillStyle = '#efeee8'
    ctx.fillRect(0, 0, size.w, RULER_SIZE)

    ctx.strokeStyle = '#cfcdc4'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(0, RULER_SIZE - 0.5)
    ctx.lineTo(size.w, RULER_SIZE - 0.5)
    ctx.stroke()

    ctx.fillStyle = '#807d72'
    ctx.font = RULER_FONT
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'

    ctx.save()
    ctx.translate(panX, 0)
    const startX = Math.max(0, Math.floor(-panX / zoom / 50) * 50)
    const endX = Math.min(maxVal, Math.ceil((size.w - panX) / zoom / 50) * 50)

    for (let i = startX; i <= endX; i += 50) {
      const x = i * zoom
      const isMajor = i % 100 === 0
      const tickH = isMajor ? RULER_SIZE * 0.5 : RULER_SIZE * 0.3

      ctx.beginPath()
      ctx.moveTo(x, RULER_SIZE)
      ctx.lineTo(x, RULER_SIZE - tickH)
      ctx.stroke()

      if (isMajor && i > 0) {
        ctx.fillText(String(i), x + 2, 3)
      }
    }
    ctx.restore()
  }, [size, zoom, panX, maxVal])

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden bg-[#efeee8]">
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}

function VerticalRuler({ zoom, panY, maxVal }: { zoom: number; panY: number; maxVal: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: RULER_SIZE, h: 0 })

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      setSize({ w: RULER_SIZE, h: entries[0].contentRect.height })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.h === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.style.width = `${RULER_SIZE}px`
    canvas.style.height = `${size.h}px`
    canvas.width = RULER_SIZE * dpr
    canvas.height = size.h * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, RULER_SIZE, size.h)
    ctx.fillStyle = '#efeee8'
    ctx.fillRect(0, 0, RULER_SIZE, size.h)

    ctx.strokeStyle = '#cfcdc4'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(RULER_SIZE - 0.5, 0)
    ctx.lineTo(RULER_SIZE - 0.5, size.h)
    ctx.stroke()

    ctx.fillStyle = '#807d72'
    ctx.font = RULER_FONT
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'

    ctx.save()
    ctx.translate(0, panY)
    const startY = Math.max(0, Math.floor(-panY / zoom / 50) * 50)
    const endY = Math.min(maxVal, Math.ceil((size.h - panY) / zoom / 50) * 50)

    for (let i = startY; i <= endY; i += 50) {
      const y = i * zoom
      const isMajor = i % 100 === 0
      const tickW = isMajor ? RULER_SIZE * 0.5 : RULER_SIZE * 0.3

      ctx.beginPath()
      ctx.moveTo(RULER_SIZE, y)
      ctx.lineTo(RULER_SIZE - tickW, y)
      ctx.stroke()

      if (isMajor && i > 0) {
        ctx.save()
        ctx.translate(RULER_SIZE / 2 - 1, y)
        ctx.rotate(-Math.PI / 2)
        ctx.fillText(String(i), 0, 0)
        ctx.restore()
      }
    }
    ctx.restore()
  }, [size, zoom, panY, maxVal])

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden bg-[#efeee8]">
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}

export interface CanvasBorderSettings {
  enabled: boolean
  style: BorderStyle
  width: number
  color: string
  padding: number
  separateSides: boolean
  svgLeft: string | null
  svgRight: string | null
}

function shouldPageHaveBorder(page: RenderedPage, allPages: RenderedPage[]): boolean {
  if (allPages.length < 3) return false
  const firstNum = allPages[0]?.pageNumber
  const lastNum = allPages[allPages.length - 1]?.pageNumber
  return page.pageNumber !== firstNum && page.pageNumber !== lastNum
}

function BorderOverlay({
  page,
  allPages,
  settings,
  zoom,
}: {
  page: RenderedPage
  allPages: RenderedPage[]
  settings: CanvasBorderSettings
  zoom: number
}) {
  if (!settings.enabled || !shouldPageHaveBorder(page, allPages)) return null

  const { style, width, color, padding, separateSides, svgLeft, svgRight } = settings

  if (style === 'custom') {
    // In standard book layout: odd pages are right-facing (recto), even pages are left-facing (verso).
    const isEven = page.pageNumber % 2 === 0
    const dataUrl = separateSides ? (isEven ? svgLeft : svgRight) : svgLeft
    if (!dataUrl) return null
    return (
      <img
        src={dataUrl}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{ width: PAGE_WIDTH * zoom, height: PAGE_HEIGHT * zoom, objectFit: 'fill' }}
      />
    )
  }

  const pad = padding * zoom
  const bw = width * zoom

  if (style === 'simple') {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute z-[5]"
        style={{
          top: pad,
          left: pad,
          right: pad,
          bottom: pad,
          border: `${bw}px solid ${color}`,
        }}
      />
    )
  }

  if (style === 'double') {
    const gap = bw * 2 + 2 * zoom
    return (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute z-[5]"
          style={{ top: pad, left: pad, right: pad, bottom: pad, border: `${bw}px solid ${color}` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute z-[5]"
          style={{
            top: pad + gap,
            left: pad + gap,
            right: pad + gap,
            bottom: pad + gap,
            border: `${bw * 0.5}px solid ${color}`,
          }}
        />
      </>
    )
  }

  if (style === 'decorative-corners') {
    const arm = Math.min(PAGE_WIDTH, PAGE_HEIGHT) * 0.08 * zoom
    const x = pad
    const y = pad
    const w = (PAGE_WIDTH - padding * 2) * zoom
    const h = (PAGE_HEIGHT - padding * 2) * zoom
    const s = `${color}`
    const sw = bw

    return (
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5]"
        width={PAGE_WIDTH * zoom}
        height={PAGE_HEIGHT * zoom}
        style={{ overflow: 'visible' }}
      >
        {/* Top-left */}
        <line x1={x} y1={y} x2={x + arm} y2={y} stroke={s} strokeWidth={sw} />
        <line x1={x} y1={y} x2={x} y2={y + arm} stroke={s} strokeWidth={sw} />
        {/* Top-right */}
        <line x1={x + w} y1={y} x2={x + w - arm} y2={y} stroke={s} strokeWidth={sw} />
        <line x1={x + w} y1={y} x2={x + w} y2={y + arm} stroke={s} strokeWidth={sw} />
        {/* Bottom-left */}
        <line x1={x} y1={y + h} x2={x + arm} y2={y + h} stroke={s} strokeWidth={sw} />
        <line x1={x} y1={y + h} x2={x} y2={y + h - arm} stroke={s} strokeWidth={sw} />
        {/* Bottom-right */}
        <line x1={x + w} y1={y + h} x2={x + w - arm} y2={y + h} stroke={s} strokeWidth={sw} />
        <line x1={x + w} y1={y + h} x2={x + w} y2={y + h - arm} stroke={s} strokeWidth={sw} />
      </svg>
    )
  }

  return null
}

export function CanvasPreview({
  renderedPages,
  previewPageIndex,
  onPreviewPageChange,
  frontCover,
  backCover,
  onLayoutItemReposition,
  focusedLayoutItem,
  onLayoutItemSelect,
  onUndoSectionFlow,
  onRedoSectionFlow,
  canUndoSectionFlow = false,
  canRedoSectionFlow = false,
  borderSettings,
}: {
  renderedPages: RenderedPage[]
  previewPageIndex: number
  onPreviewPageChange: (index: number) => void
  frontCover?: string | null
  backCover?: string | null
  onLayoutItemReposition?: (pageId: string, itemId: string, flowPosition: number) => void
  focusedLayoutItem?: { pageId: string; itemId: string } | null
  onLayoutItemSelect?: (itemId: string | null) => void
  onUndoSectionFlow?: () => void
  onRedoSectionFlow?: () => void
  canUndoSectionFlow?: boolean
  canRedoSectionFlow?: boolean
  borderSettings?: CanvasBorderSettings | null
}) {
  const [zoom, setZoom] = useState(0.85)
  const [pan, setPan] = useState({ x: 100, y: 50 })
  const [isSpaceDown, setIsSpaceDown] = useState(false)
  const [showHints, setShowHints] = useState(() => !readHintsHiddenPreference())
  const [isDragging, setIsDragging] = useState(false)
  const [itemDrag, setItemDrag] = useState<{
    pageId: string
    itemId: string
    pointerId: number
    startClientY: number
    startFlow: number
    flow: number
    contentTop: number
    maxContentY: number
  } | null>(null)

  // Build display slots: optional front cover, content pages, optional back cover
  type DisplaySlot = { kind: 'cover'; dataUrl: string; label: string } | { kind: 'page'; page: RenderedPage }
  const displaySlots: DisplaySlot[] = []
  if (frontCover) displaySlots.push({ kind: 'cover', dataUrl: frontCover, label: 'Front Cover' })
  for (const page of renderedPages) displaySlots.push({ kind: 'page', page })
  if (backCover) displaySlots.push({ kind: 'cover', dataUrl: backCover, label: 'Back Cover' })

  const totalSlots = displaySlots.length

  const containerRef = useRef<HTMLDivElement>(null)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const sectionCaptureRef = useRef<HTMLElement | null>(null)

  const safeIdx = Math.min(previewPageIndex, Math.max(0, totalSlots - 1))
  const currentSlot = displaySlots[safeIdx]

  const layoutItemStartFlowById = useMemo(() => {
    if (!currentSlot || currentSlot.kind !== 'page') {
      return new Map<string, number>()
    }
    return buildLayoutItemStartFlowMap(renderedPages, currentSlot.page.sourcePageId)
  }, [currentSlot, renderedPages])

  const layoutItemOverlays = useMemo(() => {
    if (!currentSlot || currentSlot.kind !== 'page') {
      return []
    }
    return buildLayoutItemOverlays(currentSlot.page, layoutItemStartFlowById)
  }, [currentSlot, layoutItemStartFlowById])

  const pageSupportsLayoutItems =
    currentSlot?.kind === 'page' &&
    (currentSlot.page.sourcePageType === 'core' ||
      currentSlot.page.sourcePageType === 'program' ||
      currentSlot.page.sourcePageType === 'academic' ||
      currentSlot.page.sourcePageType === 'non-academic')

  const goToPrev = () => onPreviewPageChange(Math.max(0, safeIdx - 1))
  const goToNext = () => onPreviewPageChange(Math.min(totalSlots - 1, safeIdx + 1))
  const resetView = () => {
    setZoom(0.85)
    setPan({ x: 100, y: 50 })
  }

  // Keyboard Spacebar for panning mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpaceDown(true)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false)
        setIsDragging(false)
        lastPointerRef.current = null
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Non-passive wheel listener for zoom / scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
        setZoom((prevZoom) => {
          const newZoom = Math.min(Math.max(0.2, +(prevZoom * zoomFactor).toFixed(2)), 3)
          if (newZoom !== prevZoom) {
            const rect = el.getBoundingClientRect()
            const mouseX = e.clientX - rect.left - RULER_SIZE
            const mouseY = e.clientY - rect.top - RULER_SIZE
            setPan((prevPan) => {
              const unzoomedX = (mouseX - prevPan.x) / prevZoom
              const unzoomedY = (mouseY - prevPan.y) / prevZoom
              return {
                x: mouseX - unzoomedX * newZoom,
                y: mouseY - unzoomedY * newZoom
              }
            })
          }
          return newZoom
        })
      } else {
        // Panning via scroll wheel or trackpad
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const clearLayoutItemSelection = () => {
    if (!focusedLayoutItem || !onLayoutItemSelect || isSpaceDown || itemDrag) {
      return
    }
    onLayoutItemSelect(null)
  }

  const handleCanvasBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || isSpaceDown || itemDrag) {
      return
    }
    if (e.target === e.currentTarget) {
      clearLayoutItemSelection()
    }
  }

  // Mouse interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpaceDown)) {
      e.preventDefault()
      setIsDragging(true)
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    if (e.button === 0) {
      handleCanvasBackgroundPointerDown(e)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && lastPointerRef.current) {
      const dx = e.clientX - lastPointerRef.current.x
      const dy = e.clientY - lastPointerRef.current.y
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    lastPointerRef.current = null
    releasePointerCaptureIfHeld(e.currentTarget ?? containerRef.current, e.pointerId)
  }

  const handleLayoutItemPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    itemId: string,
    flowPosition: number,
  ) => {
    if (!currentSlot || currentSlot.kind !== 'page' || !pageSupportsLayoutItems) {
      return
    }
    if (isSpaceDown || e.button !== 0) {
      return
    }
    const isSelectedInEditor =
      focusedLayoutItem?.itemId === itemId && focusedLayoutItem.pageId === currentSlot.page.sourcePageId
    if (!isSelectedInEditor) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    sectionCaptureRef.current = e.currentTarget
    e.currentTarget.setPointerCapture(e.pointerId)
    setItemDrag({
      pageId: currentSlot.page.sourcePageId,
      itemId,
      pointerId: e.pointerId,
      startClientY: e.clientY,
      startFlow: flowPosition,
      flow: flowPosition,
      contentTop: currentSlot.page.contentTop,
      maxContentY: currentSlot.page.maxContentY,
    })
  }

  const handleLayoutItemPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    setItemDrag((prev) => {
      if (!prev || prev.pointerId !== e.pointerId) {
        return prev
      }
      e.preventDefault()
      e.stopPropagation()
      const deltaY = (e.clientY - prev.startClientY) / zoom
      const snapped = snapFlowPosition(prev.startFlow + deltaY, FLOW_POSITION_SNAP_INCREMENT)
      return { ...prev, flow: Math.max(0, snapped) }
    })
  }

  const handleLayoutItemPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const pointerId = e.pointerId
    releasePointerCaptureIfHeld(sectionCaptureRef.current, pointerId)
    sectionCaptureRef.current = null

    setItemDrag((prev) => {
      if (!prev || prev.pointerId !== pointerId) {
        return prev
      }
      onLayoutItemReposition?.(prev.pageId, prev.itemId, prev.flow)
      return null
    })
    e.stopPropagation()
  }

  const handleCanvasTextPointerDown = (e: React.PointerEvent<HTMLDivElement>, itemId: string | undefined) => {
    if (!itemId || !onLayoutItemSelect || isSpaceDown || e.button !== 0) {
      return
    }
    e.stopPropagation()
    onLayoutItemSelect(itemId)
  }

  const activeGuide =
    itemDrag && currentSlot?.kind === 'page'
      ? placementFromFlow(
          itemDrag.flow,
          itemDrag.contentTop,
          itemDrag.maxContentY,
          currentSlot.page.sourcePageType,
        )
      : null

  const cursorClass = isDragging ? 'cursor-grabbing' : isSpaceDown ? 'cursor-grab' : 'cursor-default'

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-[var(--color-hairline)] bg-white">
      {/* Header */}
      <div className="z-10 flex items-center justify-between gap-2 rounded-t-xl border-b border-[var(--color-hairline-soft)] bg-white px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Canvas Preview</h2>
          <p className="truncate text-xs text-[var(--color-muted)]">
            {(() => {
              const coverCount = (frontCover ? 1 : 0) + (backCover ? 1 : 0)
              const pageLabel = `${renderedPages.length} rendered page${renderedPages.length !== 1 ? 's' : ''}`
              const coverLabel = coverCount > 0 ? ` + ${coverCount} cover${coverCount > 1 ? 's' : ''}` : ''
              return `${PAGE_WIDTH} × ${PAGE_HEIGHT} · ${pageLabel}${coverLabel}`
            })()}
          </p>
        </div>

        {onLayoutItemReposition && pageSupportsLayoutItems && (
          <div className="flex shrink-0 items-center gap-0.5 border-r border-[var(--color-hairline-soft)] pr-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-[var(--color-ink)]"
              disabled={!canUndoSectionFlow}
              onClick={onUndoSectionFlow}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="size-3.5 shrink-0" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-[var(--color-ink)]"
              disabled={!canRedoSectionFlow}
              onClick={onRedoSectionFlow}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="size-3.5 shrink-0" />
            </Button>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-[var(--color-ink)]"
            onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)))}
          >
            <Minus className="size-3.5 shrink-0" />
          </Button>
          <div className="relative h-1.5 w-16 rounded-full bg-[var(--surface-strong)]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-primary)] transition-all duration-200"
              style={{ width: `${((zoom - 0.2) / (3 - 0.2)) * 100}%` }}
            />
            <input
              type="range"
              min={0.2}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-[var(--color-ink)]"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
          >
            <Plus className="size-3.5 shrink-0" />
          </Button>
          <span className="w-10 text-center font-mono text-[11px] font-medium tabular-nums text-[var(--color-muted)]">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-[var(--color-body)]"
            onClick={resetView}
            title="Reset zoom and pan"
          >
            <RotateCcw className="mr-1 size-3.5 shrink-0" />
            Reset view
          </Button>
          {!showHints ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-[var(--color-primary)]"
              onClick={() => {
                persistHintsHiddenPreference(false)
                setShowHints(true)
              }}
              title="Show canvas navigation tips"
              aria-label="Show canvas navigation tips"
            >
              <CircleHelp className="size-3.5 shrink-0" />
            </Button>
          ) : null}
        </div>
      </div>

      {showHints ? (
        <div className="flex flex-wrap items-start gap-2 border-b border-[var(--color-hairline-soft)] bg-[var(--surface-canvas)] px-4 py-2 text-[11px] text-[var(--color-muted)]">
          <ul className="m-0 flex min-w-0 flex-1 list-disc flex-wrap items-center gap-x-6 gap-y-1 pl-4">
            <li>Hold <kbd className="rounded border border-[var(--color-hairline)] bg-white px-1">Space</kbd> + drag to pan</li>
            <li>Scroll to pan</li>
            <li><kbd className="rounded border border-[var(--color-hairline)] bg-white px-1">Ctrl/⌘</kbd> + wheel to zoom</li>
            <li>Select an item in Editor, then drag highlighted overlay to reflow</li>
          </ul>
          <button
            type="button"
            className="text-[11px] font-medium text-[var(--color-primary)] underline"
            aria-label="Hide canvas navigation tips"
            onClick={() => {
              persistHintsHiddenPreference(true)
              setShowHints(false)
            }}
          >
            Hide tips
          </button>
        </div>
      ) : null}

      {/* Infinite Canvas Viewport */}
      <div
        ref={containerRef}
        className={cn('canvas-pattern relative min-h-0 flex-1 overflow-hidden', cursorClass)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => {
          if (isSpaceDown || isDragging) e.preventDefault()
        }}
      >
        {/* Top-left corner box */}
        <div
          className="absolute left-0 top-0 z-20 border-r border-b border-[#cfcdc4] bg-[#efeee8]"
          style={{ width: RULER_SIZE, height: RULER_SIZE }}
        />

        {/* Fixed Horizontal Ruler */}
        <div
          className="absolute top-0 z-10"
          style={{ left: RULER_SIZE, right: 0, height: RULER_SIZE }}
        >
          <HorizontalRuler zoom={zoom} panX={pan.x} maxVal={PAGE_WIDTH} />
        </div>

        {/* Fixed Vertical Ruler */}
        <div
          className="absolute left-0 z-10"
          style={{ top: RULER_SIZE, bottom: 0, width: RULER_SIZE }}
        >
          <VerticalRuler zoom={zoom} panY={pan.y} maxVal={PAGE_HEIGHT} />
        </div>

        {/* Panning Content Surface */}
        <div
          className="absolute origin-top-left"
          style={{
            left: RULER_SIZE,
            top: RULER_SIZE,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          {currentSlot?.kind === 'cover' ? (
            <div
              className="absolute animate-fade-in border border-[var(--color-hairline)] bg-white transition-opacity overflow-hidden"
              style={{ width: PAGE_WIDTH * zoom, height: PAGE_HEIGHT * zoom }}
            >
              <img
                src={currentSlot.dataUrl}
                alt={currentSlot.label}
                className="pointer-events-none h-full w-full object-contain"
              />
            </div>
          ) : currentSlot?.kind === 'page' ? (
            <div
              className="absolute animate-fade-in overflow-hidden border border-[var(--color-hairline)] bg-white shadow-[0_1px_2px_rgba(38,37,30,0.06),0_8px_24px_rgba(38,37,30,0.08)] transition-opacity"
              style={{ width: PAGE_WIDTH * zoom, height: PAGE_HEIGHT * zoom }}
              onPointerDown={handleCanvasBackgroundPointerDown}
            >
              {currentSlot.page.blocks.map((block) => {
                const isSelectedBlock =
                  Boolean(block.sectionId) &&
                  focusedLayoutItem != null &&
                  focusedLayoutItem.itemId === block.sectionId &&
                  focusedLayoutItem.pageId === currentSlot.page.sourcePageId
                return (
                  <div
                    key={block.id}
                    role={block.sectionId ? 'button' : undefined}
                    tabIndex={block.sectionId ? -1 : undefined}
                    className={cn(
                      'absolute z-[1] whitespace-pre-wrap text-[var(--color-ink)]',
                      block.sectionId && !isSpaceDown && 'pointer-events-auto cursor-pointer',
                      !block.sectionId && 'pointer-events-none',
                      isSelectedBlock &&
                        'rounded-sm ring-1 ring-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)]',
                    )}
                    style={{
                      left: block.x * zoom,
                      top: block.y * zoom,
                      width: block.width * zoom,
                      maxWidth: block.width * zoom,
                      height: getBlockPreviewHeight(block, zoom),
                      fontSize: block.fontSize * zoom,
                      lineHeight: `${block.lineHeight * zoom}px`,
                      fontWeight: block.fontWeight,
                      fontStyle: block.fontStyle,
                      letterSpacing: `${(block.letterSpacing ?? 0) * zoom}px`,
                      textAlign: block.align,
                      fontFamily: getFontStack(block.fontFamily),
                      overflow: 'hidden',
                    }}
                    onPointerDown={(e) => handleCanvasTextPointerDown(e, block.sectionId)}
                  >
                    {getRenderedBlockLines(block).join('\n')}
                  </div>
                )
              })}
              {pageSupportsLayoutItems &&
                layoutItemOverlays
                  .filter(
                    (overlay) =>
                      focusedLayoutItem?.itemId === overlay.itemId &&
                      focusedLayoutItem.pageId === currentSlot.page.sourcePageId,
                  )
                  .map((overlay) => {
                    const isDraggingItem = itemDrag?.itemId === overlay.itemId
                    const translateY = isDraggingItem ? (itemDrag.flow - itemDrag.startFlow) * zoom : 0
                    return (
                      <button
                        key={`drag-${overlay.id}`}
                        type="button"
                        className={cn(
                          'absolute z-[2] rounded border border-[var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_8%,transparent)] ring-2 ring-[color:color-mix(in_srgb,var(--color-primary)_22%,transparent)] transition-colors',
                          isSpaceDown ? 'pointer-events-none' : 'cursor-ns-resize',
                        )}
                        style={{
                          left: overlay.left * zoom,
                          top: overlay.top * zoom,
                          width: overlay.width * zoom,
                          height: overlay.height * zoom,
                          transform: `translateY(${translateY}px)`,
                        }}
                        title="Drag to reposition"
                        onPointerDown={(e) =>
                          handleLayoutItemPointerDown(e, overlay.itemId, overlay.flowPosition)
                        }
                        onPointerMove={handleLayoutItemPointerMove}
                        onPointerUp={handleLayoutItemPointerUp}
                        onPointerCancel={handleLayoutItemPointerUp}
                      />
                    )
                  })}
              {pageSupportsLayoutItems &&
                activeGuide &&
                activeGuide.localPageIndex === currentSlot.page.sourcePageLocalIndex && (
                  <>
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-20 border-t border-dashed border-[var(--color-primary)]"
                      style={{ top: activeGuide.y * zoom }}
                    />
                    <div
                      className="pointer-events-none absolute z-20 rounded bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white"
                      style={{ left: 4, top: activeGuide.y * zoom + 2 }}
                    >
                      Y {Math.round(activeGuide.y)}
                    </div>
                  </>
                )}
              {borderSettings && (
                <BorderOverlay
                  page={currentSlot.page}
                  allPages={renderedPages}
                  settings={borderSettings}
                  zoom={zoom}
                />
              )}
            </div>
          ) : (
            <div className="absolute left-0 top-0 translate-x-[100px] translate-y-[50px]">
              <p className="text-sm font-medium text-[var(--color-muted)]">No pages to preview.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="z-10 flex items-center justify-between gap-3 rounded-b-xl border-t border-[var(--color-hairline)] bg-[var(--surface-canvas)] px-4 py-2.5">
        <div className="text-xs font-medium text-[var(--color-muted)]">
          {currentSlot?.kind === 'cover'
            ? `${currentSlot.label} (${safeIdx + 1} of ${totalSlots})`
            : `Page ${totalSlots > 0 ? safeIdx + 1 : 0} of ${totalSlots}`}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <label className="sr-only" htmlFor="canvas-jump-page">
            Jump to preview page
          </label>
          <select
            id="canvas-jump-page"
            value={safeIdx}
            onChange={(event) => onPreviewPageChange(Number(event.target.value))}
            className="h-8 rounded-md border border-[var(--color-hairline)] bg-white px-2 text-xs text-[var(--color-body)]"
          >
            {displaySlots.map((slot, index) => (
              <option key={`${slot.kind}-${index}`} value={index}>
                {slot.kind === 'cover' ? slot.label : `Page ${slot.page.pageNumber}`}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs text-[var(--color-body)] hover:text-[var(--color-ink)]"
            disabled={safeIdx === 0 || totalSlots === 0}
            onClick={goToPrev}
          >
            <ChevronLeft className="mr-1 size-3.5" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs text-[var(--color-body)] hover:text-[var(--color-ink)]"
            disabled={safeIdx >= totalSlots - 1 || totalSlots === 0}
            onClick={goToNext}
          >
            Next
            <ChevronRight className="ml-1 size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

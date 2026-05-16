import { ChevronLeft, ChevronRight, Minus, Plus, Redo2, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { getFontStack } from '@/lib/fonts'
import { FLOW_POSITION_SNAP_INCREMENT, snapFlowPosition } from '@/lib/flow-position'
import { getRenderedBlockLines } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { PAGE_HEIGHT, PAGE_WIDTH, type RenderedPage } from '@/types/cms'

const RULER_SIZE = 24
const RULER_FONT = `7.5px 'JetBrains Mono', 'Fira Code', monospace`
const PAGE_CENTER_X = PAGE_WIDTH / 2

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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function inferColumnFromHorizontalBounds(left: number, right: number): 0 | 1 {
  return ((left + right) / 2 >= PAGE_CENTER_X ? 1 : 0) as 0 | 1
}

function flowFromPlacement(
  localPageIndex: number,
  column: 0 | 1,
  y: number,
  contentTop: number,
  maxContentY: number,
) {
  const columnHeight = Math.max(1, maxContentY - contentTop)
  const yInColumn = clampNumber(y - contentTop, 0, columnHeight)
  return localPageIndex * columnHeight * 2 + column * columnHeight + yInColumn
}

function placementFromFlow(flowPosition: number, contentTop: number, maxContentY: number) {
  const columnHeight = Math.max(1, maxContentY - contentTop)
  const safeFlow = Math.max(0, flowPosition)
  const pageSpan = columnHeight * 2
  const localPageIndex = Math.floor(safeFlow / pageSpan)
  const withinPage = safeFlow - localPageIndex * pageSpan
  const column = (withinPage >= columnHeight ? 1 : 0) as 0 | 1
  const y = contentTop + withinPage - (column === 1 ? columnHeight : 0)
  return { localPageIndex, column, y }
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

export function CanvasPreview({
  renderedPages,
  previewPageIndex,
  onPreviewPageChange,
  frontCover,
  backCover,
  onCoreSectionReposition,
  focusedCoreSection,
  onUndoSectionFlow,
  onRedoSectionFlow,
  canUndoSectionFlow = false,
  canRedoSectionFlow = false,
}: {
  renderedPages: RenderedPage[]
  previewPageIndex: number
  onPreviewPageChange: (index: number) => void
  frontCover?: string | null
  backCover?: string | null
  onCoreSectionReposition?: (pageId: string, sectionId: string, flowPosition: number) => void
  focusedCoreSection?: { pageId: string; sectionId: string } | null
  onUndoSectionFlow?: () => void
  onRedoSectionFlow?: () => void
  canUndoSectionFlow?: boolean
  canRedoSectionFlow?: boolean
}) {
  const [zoom, setZoom] = useState(0.85)
  const [pan, setPan] = useState({ x: 100, y: 50 })
  const [isSpaceDown, setIsSpaceDown] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [sectionDrag, setSectionDrag] = useState<{
    pageId: string
    sectionId: string
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

  const coreSectionStartFlowById = useMemo(() => {
    const startById = new Map<string, number>()
    if (!currentSlot || currentSlot.kind !== 'page' || currentSlot.page.sourcePageType !== 'core') {
      return startById
    }

    const sourcePageId = currentSlot.page.sourcePageId
    for (const renderedPage of renderedPages) {
      if (renderedPage.sourcePageType !== 'core' || renderedPage.sourcePageId !== sourcePageId) {
        continue
      }
      for (const block of renderedPage.blocks) {
        if (!block.sectionId) {
          continue
        }
        const column = inferColumnFromHorizontalBounds(block.x, block.x + block.width)
        const flow = flowFromPlacement(
          renderedPage.sourcePageLocalIndex,
          column,
          block.y,
          renderedPage.contentTop,
          renderedPage.maxContentY,
        )
        const currentStart = startById.get(block.sectionId)
        if (currentStart === undefined || flow < currentStart) {
          startById.set(block.sectionId, flow)
        }
      }
    }

    return startById
  }, [currentSlot, renderedPages])

  const coreSectionOverlays = useMemo(() => {
    if (!currentSlot || currentSlot.kind !== 'page' || currentSlot.page.sourcePageType !== 'core') {
      return []
    }
    const grouped = new Map<string, RenderedPage['blocks']>()
    for (const block of currentSlot.page.blocks) {
      if (!block.sectionId) continue
      const list = grouped.get(block.sectionId) ?? []
      list.push(block)
      grouped.set(block.sectionId, list)
    }
    return [...grouped.entries()].map(([sectionId, blocks]) => {
      const left = Math.min(...blocks.map((b) => b.x))
      const top = Math.min(...blocks.map((b) => b.y))
      const right = Math.max(...blocks.map((b) => b.x + b.width))
      const bottom = Math.max(...blocks.map((b) => b.y + b.lines.length * b.lineHeight))
      const fallbackFlow = flowFromPlacement(
        currentSlot.page.sourcePageLocalIndex,
        inferColumnFromHorizontalBounds(left, right),
        top,
        currentSlot.page.contentTop,
        currentSlot.page.maxContentY,
      )
      const flowPosition = coreSectionStartFlowById.get(sectionId) ?? fallbackFlow
      return {
        sectionId,
        left,
        top,
        width: Math.max(8, right - left),
        height: Math.max(8, bottom - top),
        flowPosition,
      }
    })
  }, [coreSectionStartFlowById, currentSlot])

  const goToPrev = () => onPreviewPageChange(Math.max(0, safeIdx - 1))
  const goToNext = () => onPreviewPageChange(Math.min(totalSlots - 1, safeIdx + 1))

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

  // Mouse interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpaceDown)) {
      e.preventDefault()
      setIsDragging(true)
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      e.currentTarget.setPointerCapture(e.pointerId)
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

  const handleSectionPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    sectionId: string,
    flowPosition: number,
  ) => {
    if (!currentSlot || currentSlot.kind !== 'page' || currentSlot.page.sourcePageType !== 'core') {
      return
    }
    if (isSpaceDown || e.button !== 0) {
      return
    }
    const isSelectedInEditor =
      focusedCoreSection?.sectionId === sectionId &&
      focusedCoreSection.pageId === currentSlot.page.sourcePageId
    if (!isSelectedInEditor) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    sectionCaptureRef.current = e.currentTarget
    e.currentTarget.setPointerCapture(e.pointerId)
    setSectionDrag({
      pageId: currentSlot.page.sourcePageId,
      sectionId,
      pointerId: e.pointerId,
      startClientY: e.clientY,
      startFlow: flowPosition,
      flow: flowPosition,
      contentTop: currentSlot.page.contentTop,
      maxContentY: currentSlot.page.maxContentY,
    })
  }

  const handleSectionPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    setSectionDrag((prev) => {
      if (!prev || prev.pointerId !== e.pointerId) {
        return prev
      }
      e.preventDefault()
      e.stopPropagation()
      // Convert pointer movement from screen px back to document-space px, so drag behavior stays correct at any zoom.
      const deltaY = (e.clientY - prev.startClientY) / zoom
      const snapped = snapFlowPosition(prev.startFlow + deltaY, FLOW_POSITION_SNAP_INCREMENT)
      return { ...prev, flow: Math.max(0, snapped) }
    })
  }

  const handleSectionPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const pointerId = e.pointerId
    releasePointerCaptureIfHeld(sectionCaptureRef.current, pointerId)
    sectionCaptureRef.current = null

    setSectionDrag((prev) => {
      if (!prev || prev.pointerId !== pointerId) {
        return prev
      }
      onCoreSectionReposition?.(prev.pageId, prev.sectionId, prev.flow)
      return null
    })
    e.stopPropagation()
  }

  const activeGuide =
    sectionDrag && currentSlot?.kind === 'page'
      ? placementFromFlow(sectionDrag.flow, sectionDrag.contentTop, sectionDrag.maxContentY)
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

        {onCoreSectionReposition && (
          <div className="flex shrink-0 items-center gap-0.5 border-r border-[var(--color-hairline-soft)] pr-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-[var(--color-ink)]"
              disabled={!canUndoSectionFlow}
              onClick={onUndoSectionFlow}
              title="Undo section move (Ctrl+Z)"
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
              title="Redo section move (Ctrl+Y)"
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
        </div>
      </div>

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
            >
              {currentSlot.page.blocks.map((block) => (
                <div
                  key={block.id}
                  className="pointer-events-none absolute z-[1] whitespace-pre-wrap text-[var(--color-ink)]"
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
                >
                  {getRenderedBlockLines(block).join('\n')}
                </div>
              ))}
              {currentSlot.page.sourcePageType === 'core' &&
                coreSectionOverlays
                  .filter(
                    (overlay) =>
                      focusedCoreSection?.sectionId === overlay.sectionId &&
                      focusedCoreSection.pageId === currentSlot.page.sourcePageId,
                  )
                  .map((overlay) => {
                    const isDraggingSection = sectionDrag?.sectionId === overlay.sectionId
                    const translateY = isDraggingSection
                      ? (sectionDrag.flow - sectionDrag.startFlow) * zoom
                      : 0
                    return (
                      <button
                        key={`drag-${overlay.sectionId}`}
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
                        title="Drag to reposition section"
                        onPointerDown={(e) =>
                          handleSectionPointerDown(e, overlay.sectionId, overlay.flowPosition)
                        }
                        onPointerMove={handleSectionPointerMove}
                        onPointerUp={handleSectionPointerUp}
                        onPointerCancel={handleSectionPointerUp}
                      />
                    )
                  })}
              {currentSlot.page.sourcePageType === 'core' &&
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
        <div className="flex items-center gap-1">
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

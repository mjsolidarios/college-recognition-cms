import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { renderDocument } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { PAGE_HEIGHT, PAGE_WIDTH, type CmsPage, type CmsSettings } from '@/types/cms'

const RULER_SIZE = 24
const RULER_FONT = `7.5px Inter, system-ui, -apple-system, sans-serif`

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
    ctx.fillStyle = '#edecea'
    ctx.fillRect(0, 0, size.w, RULER_SIZE)

    ctx.strokeStyle = '#c8c5be'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(0, RULER_SIZE - 0.5)
    ctx.lineTo(size.w, RULER_SIZE - 0.5)
    ctx.stroke()

    ctx.fillStyle = '#a8a29e'
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
    <div ref={containerRef} className="h-full w-full overflow-hidden bg-[#edecea]">
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
    ctx.fillStyle = '#edecea'
    ctx.fillRect(0, 0, RULER_SIZE, size.h)

    ctx.strokeStyle = '#c8c5be'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(RULER_SIZE - 0.5, 0)
    ctx.lineTo(RULER_SIZE - 0.5, size.h)
    ctx.stroke()

    ctx.fillStyle = '#a8a29e'
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
    <div ref={containerRef} className="h-full w-full overflow-hidden bg-[#edecea]">
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}

export function CanvasPreview({
  pages,
  settings,
}: {
  pages: CmsPage[]
  settings: CmsSettings
}) {
  const [zoom, setZoom] = useState(0.85)
  const [pan, setPan] = useState({ x: 100, y: 50 })
  const [isSpaceDown, setIsSpaceDown] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  const [currentPageIdx, setCurrentPageIdx] = useState(0)
  const renderedPages = useMemo(() => renderDocument(pages, settings), [pages, settings])
  const pageCount = renderedPages.length

  const containerRef = useRef<HTMLDivElement>(null)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)

  // Keep current page in bounds when pages are added/removed
  useEffect(() => {
    setCurrentPageIdx((prev) => Math.min(prev, Math.max(0, pageCount - 1)))
  }, [pageCount])

  const safeIdx = Math.min(currentPageIdx, Math.max(0, pageCount - 1))
  const currentPage = renderedPages[safeIdx]

  const goToPrev = () => setCurrentPageIdx((i) => Math.max(0, i - 1))
  const goToNext = () => setCurrentPageIdx((i) => Math.min(pageCount - 1, i + 1))

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
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const cursorClass = isDragging ? 'cursor-grabbing' : isSpaceDown ? 'cursor-grab' : 'cursor-default'

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-stone-200/80 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-2.5 z-10 bg-white rounded-t-xl">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-stone-900">Canvas Preview</h2>
          <p className="truncate text-xs text-stone-400">
            {PAGE_WIDTH} × {PAGE_HEIGHT} · {pageCount} rendered page{pageCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)))}
          >
            <Minus className="size-3.5" />
          </Button>
          <div className="relative h-1.5 w-16 rounded-full bg-stone-100">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-indigo-400/60 transition-all duration-200"
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
            className="size-7"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
          >
            <Plus className="size-3.5" />
          </Button>
          <span className="w-10 text-center text-[11px] font-medium tabular-nums text-stone-400">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Infinite Canvas Viewport */}
      <div
        ref={containerRef}
        className={cn('min-h-0 flex-1 relative overflow-hidden bg-[#f5f5f4]', cursorClass)}
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
          className="absolute left-0 top-0 z-20 bg-[#edecea] border-r border-b border-[#c8c5be]"
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
          {currentPage ? (
            <div
              className="absolute bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.05)] ring-1 ring-stone-900/5 transition-opacity animate-fade-in"
              style={{ width: PAGE_WIDTH * zoom, height: PAGE_HEIGHT * zoom }}
            >
              {currentPage.blocks.map((block) => (
                <div
                  key={block.id}
                  className={cn(
                    'absolute whitespace-pre text-stone-950 pointer-events-none',
                    block.uppercase && 'uppercase'
                  )}
                  style={{
                    left: block.x * zoom,
                    top: block.y * zoom,
                    width: block.width * zoom,
                    fontSize: block.fontSize * zoom,
                    lineHeight: `${block.lineHeight * zoom}px`,
                    fontWeight: block.fontWeight,
                    fontStyle: block.fontStyle,
                    letterSpacing: `${(block.letterSpacing ?? 0) * zoom}px`,
                    textAlign: block.align,
                    fontFamily: 'Georgia, "Times New Roman", serif',
                  }}
                >
                  {block.lines.join('\n')}
                </div>
              ))}
            </div>
          ) : (
            <div className="absolute left-0 top-0 translate-x-[100px] translate-y-[50px]">
              <p className="text-sm font-medium text-stone-400">No pages to preview.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between gap-3 border-t border-stone-200 px-4 py-2.5 bg-stone-50 rounded-b-xl z-10">
        <div className="text-xs font-medium text-stone-500">
          Page {pageCount > 0 ? safeIdx + 1 : 0} of {pageCount}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs text-stone-600 hover:text-stone-900"
            disabled={safeIdx === 0 || pageCount === 0}
            onClick={goToPrev}
          >
            <ChevronLeft className="mr-1 size-3.5" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs text-stone-600 hover:text-stone-900"
            disabled={safeIdx >= pageCount - 1 || pageCount === 0}
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

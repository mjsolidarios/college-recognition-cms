import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { renderDocument } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { PAGE_HEIGHT, PAGE_WIDTH, type CmsPage, type CmsSettings } from '@/types/cms'

const RULER_SIZE = 24
const RULER_FONT = `7.5px Inter, system-ui, -apple-system, sans-serif`

function HorizontalRuler({ width, zoom }: { width: number; zoom: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cssWidth = Math.round(width * zoom)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${RULER_SIZE}px`
    canvas.width = cssWidth * dpr
    canvas.height = RULER_SIZE * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, cssWidth, RULER_SIZE)
    ctx.fillStyle = '#edecea'
    ctx.fillRect(0, 0, cssWidth, RULER_SIZE)

    ctx.strokeStyle = '#c8c5be'
    ctx.lineWidth = 0.5

    ctx.beginPath()
    ctx.moveTo(0, RULER_SIZE - 0.5)
    ctx.lineTo(cssWidth, RULER_SIZE - 0.5)
    ctx.stroke()

    ctx.fillStyle = '#a8a29e'
    ctx.font = RULER_FONT
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'

    for (let i = 0; i <= width; i += 50) {
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
  }, [cssWidth, zoom, width])

  return <canvas ref={canvasRef} style={{ display: 'block', flexShrink: 0 }} />
}

function VerticalRuler({ height, zoom }: { height: number; zoom: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cssHeight = Math.round(height * zoom)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.style.width = `${RULER_SIZE}px`
    canvas.style.height = `${cssHeight}px`
    canvas.width = RULER_SIZE * dpr
    canvas.height = cssHeight * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, RULER_SIZE, cssHeight)
    ctx.fillStyle = '#edecea'
    ctx.fillRect(0, 0, RULER_SIZE, cssHeight)

    ctx.strokeStyle = '#c8c5be'
    ctx.lineWidth = 0.5

    ctx.beginPath()
    ctx.moveTo(RULER_SIZE - 0.5, 0)
    ctx.lineTo(RULER_SIZE - 0.5, cssHeight)
    ctx.stroke()

    ctx.fillStyle = '#a8a29e'
    ctx.font = RULER_FONT
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'

    for (let i = 0; i <= height; i += 50) {
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
  }, [cssHeight, zoom, height])

  return <canvas ref={canvasRef} style={{ display: 'block', flexShrink: 0 }} />
}

export function CanvasPreview({
  pages,
  settings,
}: {
  pages: CmsPage[]
  settings: CmsSettings
}) {
  const [zoom, setZoom] = useState(0.85)
  const [currentPageIdx, setCurrentPageIdx] = useState(0)
  const renderedPages = useMemo(() => renderDocument(pages, settings), [pages, settings])
  const pageCount = renderedPages.length

  // Keep current page in bounds when pages are added/removed
  useEffect(() => {
    setCurrentPageIdx((prev) => Math.min(prev, Math.max(0, pageCount - 1)))
  }, [pageCount])

  const safeIdx = Math.min(currentPageIdx, Math.max(0, pageCount - 1))
  const currentPage = renderedPages[safeIdx]

  const goToPrev = () => setCurrentPageIdx((i) => Math.max(0, i - 1))
  const goToNext = () => setCurrentPageIdx((i) => Math.min(pageCount - 1, i + 1))

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-stone-200/80 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-stone-900">Canvas Preview</h2>
          <p className="truncate text-xs text-stone-400">
            {PAGE_WIDTH} × {PAGE_HEIGHT} · {pageCount} rendered page{pageCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={safeIdx === 0}
            onClick={goToPrev}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="min-w-[3.5rem] text-center text-[11px] font-semibold tabular-nums text-stone-600">
            {pageCount > 0 ? `${safeIdx + 1} / ${pageCount}` : '–'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={safeIdx >= pageCount - 1}
            onClick={goToNext}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setZoom((z) => Math.max(0.45, +(z - 0.1).toFixed(2)))}
          >
            <Minus className="size-3.5" />
          </Button>
          <div className="relative h-1.5 w-16 rounded-full bg-stone-100">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-indigo-400/60 transition-all duration-200"
              style={{ width: `${((zoom - 0.45) / (1.35 - 0.45)) * 100}%` }}
            />
            <input
              type="range"
              min={0.45}
              max={1.35}
              step={0.05}
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
            onClick={() => setZoom((z) => Math.min(1.35, +(z + 0.1).toFixed(2)))}
          >
            <Plus className="size-3.5" />
          </Button>
          <span className="w-9 text-center text-[11px] font-medium tabular-nums text-stone-400">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="min-h-0 flex-1 border-b border-stone-100">
        <ScrollArea className="h-full">
          <div className="canvas-pattern flex min-h-full items-start justify-center p-8">
            {currentPage ? (
              <div className={cn('animate-fade-in flex flex-col')}>
                {/* Top row: corner + horizontal ruler */}
                <div className="flex">
                  <div
                    style={{
                      width: RULER_SIZE,
                      height: RULER_SIZE,
                      flexShrink: 0,
                      backgroundColor: '#edecea',
                      borderRight: '1px solid #c8c5be',
                      borderBottom: '1px solid #c8c5be',
                    }}
                  />
                  <HorizontalRuler width={PAGE_WIDTH} zoom={zoom} />
                </div>
                {/* Content row: vertical ruler + page */}
                <div className="flex">
                  <VerticalRuler height={PAGE_HEIGHT} zoom={zoom} />
                  <div
                    className="relative overflow-hidden bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.05)]"
                    style={{ width: PAGE_WIDTH * zoom, height: PAGE_HEIGHT * zoom }}
                  >
                    {currentPage.blocks.map((block) => (
                      <div
                        key={block.id}
                        className={cn(
                          'absolute whitespace-pre overflow-hidden text-stone-950',
                          block.uppercase && 'uppercase',
                        )}
                        style={{
                          left: block.x * zoom,
                          top: block.y * zoom,
                          width: block.width * zoom,
                          height: block.lines.length * block.lineHeight * zoom,
                          fontSize: block.fontSize * zoom,
                          lineHeight: `${block.lineHeight * zoom}px`,
                          fontWeight: block.fontWeight,
                          fontStyle: block.fontStyle,
                          letterSpacing: `${(block.letterSpacing ?? 0) * zoom}px`,
                          textAlign: block.align,
                          fontFamily: 'Georgia, Times New Roman, serif',
                        }}
                      >
                        {block.lines.join('\n')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-12 text-sm text-stone-400">No pages to preview.</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-stone-50 rounded-b-xl">
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

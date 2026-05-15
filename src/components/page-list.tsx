import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { FileText, GripVertical, LayoutList, Medal, Plus, Star, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CmsPage, PageType } from '@/types/cms'

const PAGE_TYPE_CONFIG: Record<PageType, { label: string; color: string; bgColor: string; borderColor: string; icon: typeof FileText }> = {
  core: { label: 'Core', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', icon: FileText },
  program: { label: 'Program', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: LayoutList },
  academic: { label: 'Academic', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: Medal },
  'non-academic': { label: 'Non-Academic', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200', icon: Star },
}

function TypeBadge({ type }: { type: PageType }) {
  const config = PAGE_TYPE_CONFIG[type]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', config.bgColor, config.color)}>
      {config.label}
    </span>
  )
}

function SortablePageItem({
  page,
  isActive,
  index,
  onSelect,
  onDelete,
}: {
  page: CmsPage
  isActive: boolean
  index: number
  onSelect: (pageId: string) => void
  onDelete: (pageId: string) => void
}) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: page.id })
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({ id: page.id })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const config = PAGE_TYPE_CONFIG[page.type]

  return (
    <button
      ref={(node) => {
        setDroppableRef(node)
        setDraggableRef(node)
      }}
      type="button"
      style={style}
      onClick={() => onSelect(page.id)}
      className={cn(
        'group flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-200',
        isActive
          ? `border-l-[3px] ${config.borderColor} bg-white shadow-sm`
          : 'border-transparent bg-transparent hover:bg-stone-50',
        isOver && 'ring-2 ring-indigo-400/30',
        isDragging && 'opacity-60 shadow-lg scale-[1.02]',
      )}
    >
      <span
        className={cn('mt-0.5 inline-flex cursor-grab text-stone-300 transition-colors hover:text-stone-500', isActive && 'text-stone-400')}
        {...listeners}
        {...attributes}
        onClick={(event) => event.stopPropagation()}
      >
        <GripVertical className="size-4" />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-center gap-2">
          <span className={cn('text-xs font-medium text-stone-400 tabular-nums', isActive && 'text-stone-500')}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className={cn('block truncate text-sm font-semibold', isActive ? 'text-stone-900' : 'text-stone-700')}>{page.title}</span>
        </span>
        <TypeBadge type={page.type} />
      </span>
      <span className="opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 text-stone-400 hover:text-red-500"
          onClick={(event) => {
            event.stopPropagation()
            onDelete(page.id)
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </span>
    </button>
  )
}

export function PageList({
  pages,
  activePageId,
  onSelect,
  onAdd,
  onDelete,
  onReorder,
}: {
  pages: CmsPage[]
  activePageId: string
  onSelect: (pageId: string) => void
  onAdd: (pageType: PageType) => void
  onDelete: (pageId: string) => void
  onReorder: (activeId: string, overId: string) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return
    }

    onReorder(String(active.id), String(over.id))
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-stone-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Pages</h2>
          <p className="text-xs text-stone-400">{pages.length} page{pages.length !== 1 ? 's' : ''} · drag to reorder</p>
        </div>
      </div>

      <div className="border-b border-stone-100 px-3 py-2.5">
        <div className="grid grid-cols-2 gap-1.5">
          {(['core', 'program', 'academic', 'non-academic'] as PageType[]).map((pageType) => {
            const config = PAGE_TYPE_CONFIG[pageType]
            const Icon = config.icon
            return (
              <button
                key={pageType}
                type="button"
                onClick={() => onAdd(pageType)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs font-medium transition-all duration-200 hover:border-solid cursor-pointer',
                  config.borderColor, config.color,
                  'hover:shadow-sm',
                )}
              >
                <Icon className="size-3.5" />
                <Plus className="size-3" />
                {config.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="space-y-0.5">
            {pages.map((page, index) => (
              <SortablePageItem
                key={page.id}
                page={page}
                index={index}
                isActive={page.id === activePageId}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </div>
        </DndContext>
      </div>
    </div>
  )
}

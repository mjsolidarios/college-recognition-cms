import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { FileText, GripVertical, LayoutList, Medal, PanelLeftClose, PanelLeftOpen, Plus, Star, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CmsPage, PageType, RenderedPage } from '@/types/cms'

const PAGE_TYPE_CONFIG: Record<PageType, { label: string; color: string; bgColor: string; borderColor: string; icon: typeof FileText }> = {
  core: { label: 'Core', color: 'text-[rgb(var(--type-core))]', bgColor: 'bg-[rgb(var(--type-core)/0.12)]', borderColor: 'border-[rgb(var(--type-core)/0.35)]', icon: FileText },
  program: { label: 'Program', color: 'text-[rgb(var(--type-program))]', bgColor: 'bg-[rgb(var(--type-program)/0.12)]', borderColor: 'border-[rgb(var(--type-program)/0.35)]', icon: LayoutList },
  academic: { label: 'Acad', color: 'text-[rgb(var(--type-academic))]', bgColor: 'bg-[rgb(var(--type-academic)/0.12)]', borderColor: 'border-[rgb(var(--type-academic)/0.35)]', icon: Medal },
  'non-academic': { label: 'Non-Acad', color: 'text-[rgb(var(--type-non-academic))]', bgColor: 'bg-[rgb(var(--type-non-academic)/0.12)]', borderColor: 'border-[rgb(var(--type-non-academic)/0.35)]', icon: Star },
}
const PAGE_TYPE_ORDER: PageType[] = ['core', 'program', 'academic', 'non-academic']

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
  activeSubpageIndex,
  index,
  collapsed,
  subpages,
  onSelect,
  onSelectSubpage,
  onDelete,
}: {
  page: CmsPage
  isActive: boolean
  activeSubpageIndex: number | null
  index: number
  collapsed: boolean
  subpages: RenderedPage[]
  onSelect: (pageId: string) => void
  onSelectSubpage?: (pageId: string, sourcePageLocalIndex: number) => void
  onDelete: (pageId: string) => void
}) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: page.id })
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({ id: page.id })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const config = PAGE_TYPE_CONFIG[page.type]
  const Icon = config.icon

  const hasSubpages = !collapsed && subpages.length > 1

  return (
    <div
      ref={(node) => {
        setDroppableRef(node)
        setDraggableRef(node)
      }}
      style={style}
      className={cn(
        'group w-full rounded-xl border transition-all duration-200',
        collapsed ? 'flex flex-col items-center gap-2 px-2 py-2.5' : 'px-3 py-2.5',
        isActive
          ? `${config.borderColor} bg-white shadow-[var(--shadow-panel-active)]`
          : 'border-transparent bg-transparent hover:bg-[var(--surface-canvas)]',
        isOver && 'ring-2 ring-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)]',
        isDragging && 'scale-[1.02] opacity-60',
      )}
      title={collapsed ? page.title : undefined}
    >
      <div className={cn('flex w-full', collapsed ? 'flex-col items-center gap-2' : 'items-start gap-2.5')}>
        <span
          className={cn(
            'inline-flex cursor-grab text-[var(--color-muted-soft)] transition-colors hover:text-[var(--color-muted)]',
            collapsed ? 'mt-0 justify-center' : 'mt-0.5',
            isActive && 'text-[var(--color-muted)]',
          )}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-4" />
        </span>
        <button
          type="button"
          className={cn(
            'min-w-0 flex-1 text-left',
            collapsed ? 'flex w-full flex-col items-center gap-1 text-center' : 'space-y-1',
          )}
          onClick={() => onSelect(page.id)}
        >
          <span className={cn('flex items-center gap-2', collapsed && 'flex-col gap-1')}>
            <span className={cn('text-xs font-medium tabular-nums text-[var(--color-muted-soft)]', isActive && 'text-[var(--color-muted)]')}>
              {String(index + 1).padStart(2, '0')}
            </span>
            {collapsed ? (
              <span className={cn('inline-flex size-10 items-center justify-center rounded-xl border', config.borderColor, config.bgColor, config.color)}>
                <Icon className="size-4" />
              </span>
            ) : (
              <span className={cn('block truncate text-sm font-semibold', isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-body)]')}>{page.title}</span>
            )}
          </span>
          {collapsed ? (
            <span className={cn('block max-w-full truncate text-[11px] font-semibold', isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-body)]')}>
              {page.title}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <TypeBadge type={page.type} />
              {hasSubpages ? (
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-soft)]">
                  {subpages.length} sheets
                </span>
              ) : null}
            </span>
          )}
        </button>
        {!collapsed ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(
              'size-7 text-[var(--color-muted)] opacity-0 transition-opacity hover:text-[var(--color-danger)] group-focus-within:opacity-100 sm:group-hover:opacity-100',
              isActive && 'opacity-100',
            )}
            onClick={() => onDelete(page.id)}
            aria-label={`Delete ${page.title}`}
            title={`Delete ${page.title}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
      {hasSubpages ? (
        <div className="ml-8 mt-2 border-l border-[var(--color-hairline-soft)] pl-3">
          {subpages.map((subpage) => {
            const isSubpageActive = isActive && activeSubpageIndex === subpage.sourcePageLocalIndex
            return (
              <button
                key={subpage.id}
                type="button"
                className={cn(
                  'relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                  isSubpageActive
                    ? 'bg-[var(--surface-canvas)] font-semibold text-[var(--color-ink)]'
                    : 'text-[var(--color-muted)] hover:bg-[var(--surface-canvas)] hover:text-[var(--color-body)]',
                )}
                onClick={() => onSelectSubpage?.(page.id, subpage.sourcePageLocalIndex)}
              >
                <span className="absolute -left-3 top-1/2 h-px w-2 bg-[var(--color-hairline-soft)]" />
                <span className="font-mono text-[10px] tabular-nums text-[var(--color-muted-soft)]">
                  {index + 1}.{subpage.sourcePageLocalIndex + 1}
                </span>
                <span className="truncate">Sheet {subpage.sourcePageLocalIndex + 1}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function PageList({
  pages,
  renderedPages = [],
  activePageId,
  activePreviewPageIndex = 0,
  onSelect,
  onSelectSubpage,
  onAdd,
  onDelete,
  onReorder,
  collapsed = false,
  allowCollapse = false,
  onToggleCollapsed,
}: {
  pages: CmsPage[]
  renderedPages?: RenderedPage[]
  activePageId: string
  activePreviewPageIndex?: number
  onSelect: (pageId: string) => void
  onSelectSubpage?: (pageId: string, sourcePageLocalIndex: number) => void
  onAdd: (pageType: PageType) => void
  onDelete: (pageId: string) => void
  onReorder: (activeId: string, overId: string) => void
  collapsed?: boolean
  allowCollapse?: boolean
  onToggleCollapsed?: () => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const activePage = pages.find((page) => page.id === activePageId) ?? pages.at(0) ?? null
  const addButtonGroupClass = collapsed ? 'grid grid-cols-1 gap-1.5' : 'flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0'
  const activeRenderedPage = renderedPages[activePreviewPageIndex - 1] ?? null
  const subpagesByPageId = renderedPages.reduce((groups, renderedPage) => {
    const current = groups.get(renderedPage.sourcePageId) ?? []
    current.push(renderedPage)
    groups.set(renderedPage.sourcePageId, current)
    return groups
  }, new Map<string, RenderedPage[]>())

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return
    }

    onReorder(String(active.id), String(over.id))
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white shadow-[var(--shadow-panel)]',
        collapsed && 'items-center',
      )}
    >
      <div className={cn('border-b border-[var(--color-hairline-soft)]', collapsed ? 'w-full px-2 py-2' : 'px-4 py-3')}>
        <div className={cn('flex items-start gap-3', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed ? (
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[var(--color-ink)]">Pages</h2>
              <p className="text-xs text-[var(--color-muted)]">
                {pages.length} page{pages.length !== 1 ? 's' : ''} · drag to reorder
              </p>
              {activePage ? (
                <p className="mt-1 truncate text-[11px] text-[var(--color-muted-soft)]">
                  Active: <span className="font-medium text-[var(--color-body)]">{activePage.title}</span>
                </p>
              ) : null}
            </div>
          ) : null}
          {allowCollapse ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-full border border-[var(--color-hairline)] bg-white text-[var(--color-muted)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--surface-canvas)]"
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand pages panel' : 'Collapse pages panel'}
              title={collapsed ? 'Expand pages panel' : 'Collapse pages panel'}
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          ) : null}
        </div>
        {!collapsed && (
          <div className="mt-3 rounded-xl border border-[var(--color-hairline-soft)] bg-[var(--surface-canvas)] px-3 py-2 text-[11px] text-[var(--color-muted)]">
            Tap a page to edit it, or drag the handle to reorder the booklet flow.
          </div>
        )}
      </div>

      <div className={cn('border-b border-[var(--color-hairline-soft)]', collapsed ? 'w-full px-2 py-2.5' : 'px-3 py-3')}>
        <div
          className={cn(addButtonGroupClass)}
          role="region"
          aria-label={collapsed ? 'Collapsed add page shortcuts' : 'Add page shortcuts'}
        >
          {PAGE_TYPE_ORDER.map((pageType) => {
            const config = PAGE_TYPE_CONFIG[pageType]
            const Icon = config.icon
            const actionButtonClass = collapsed
              ? 'h-11 items-center justify-center px-0'
              : 'min-w-[9.5rem] flex-shrink-0 items-center gap-1.5 px-3 py-2 sm:min-w-0'
            return (
              <button
                key={pageType}
                type="button"
                onClick={() => onAdd(pageType)}
                className={cn(
                  'flex rounded-xl border border-dashed text-xs font-medium transition-colors duration-200 hover:border-solid cursor-pointer',
                  actionButtonClass,
                  config.borderColor, config.color,
                  'hover:bg-[var(--surface-canvas)]',
                )}
                aria-label={`Add ${config.label} page`}
                title={`Add ${config.label} page`}
              >
                <Icon className="size-3.5" />
                {!collapsed && (
                  <>
                    <Plus className="size-3" />
                    <span className="whitespace-nowrap">{config.label}</span>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className={cn('flex-1 overflow-y-auto', collapsed ? 'w-full px-2 py-2' : 'px-2 py-2')}>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className={cn(collapsed ? 'space-y-2' : 'space-y-1')}>
            {pages.map((page, index) => (
              <SortablePageItem
                key={page.id}
                page={page}
                index={index}
                collapsed={collapsed}
                isActive={page.id === activePageId}
                activeSubpageIndex={
                  activeRenderedPage?.sourcePageId === page.id ? activeRenderedPage.sourcePageLocalIndex : null
                }
                subpages={subpagesByPageId.get(page.id) ?? []}
                onSelect={onSelect}
                onSelectSubpage={onSelectSubpage}
                onDelete={onDelete}
              />
            ))}
          </div>
        </DndContext>
      </div>
    </div>
  )
}

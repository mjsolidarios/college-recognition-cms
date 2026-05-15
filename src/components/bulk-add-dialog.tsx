import * as Dialog from '@radix-ui/react-dialog'
import { ListPlus, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { AcademicEntry, NonAcademicEntry } from '@/types/cms'

function parseNames(raw: string): string[] {
  return raw.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
}

function SectionLabel({ children }: { children: string }) {
  return <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">{children}</label>
}

function Shell({ open, onOpenChange, trigger, title, desc, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; trigger: React.ReactNode
  title: string; desc: string; children: React.ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-stone-200 bg-white p-5 shadow-xl animate-scale-in">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <Dialog.Title className="text-sm font-semibold text-stone-900">{title}</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-stone-500">{desc}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon" className="size-7 text-stone-400 flex-shrink-0">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function BulkAddAcademicDialog({ onAdd }: { onAdd: (e: AcademicEntry[]) => void }) {
  const [open, setOpen] = useState(false)
  const [award, setAward] = useState('')
  const [category, setCategory] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [namesRaw, setNamesRaw] = useState('')
  const names = parseNames(namesRaw)
  const count = names.length

  const submit = () => {
    if (!count) return
    onAdd(names.map((name) => ({ id: crypto.randomUUID(), name, award: award || 'Award or program', category: category || 'Category', gradeLevel: gradeLevel || 'Grade level' })))
    setAward(''); setCategory(''); setGradeLevel(''); setNamesRaw(''); setOpen(false)
  }

  return (
    <Shell open={open} onOpenChange={setOpen} title="Bulk Add Academic Awardees" desc="Set shared fields, then paste names (one per line)."
      trigger={
        <button type="button" className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-300 px-3 py-2.5 text-xs font-medium text-emerald-600 transition-all duration-200 hover:border-solid hover:bg-emerald-50/50 cursor-pointer">
          <ListPlus className="size-3.5" />Bulk add names
        </button>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><SectionLabel>Award / Program</SectionLabel><Input value={award} onChange={(e) => setAward(e.target.value)} placeholder="e.g. Bachelor of Science in IT" /></div>
          <div className="space-y-1.5"><SectionLabel>Category</SectionLabel><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Gold Medals" /></div>
          <div className="space-y-1.5"><SectionLabel>Grade Level</SectionLabel><Input value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="e.g. 4th Year" /></div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <SectionLabel>Names (one per line)</SectionLabel>
            {count > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{count} name{count !== 1 ? 's' : ''}</span>}
          </div>
          <Textarea value={namesRaw} onChange={(e) => setNamesRaw(e.target.value)} placeholder={'Von Ashley P. Chichirita\nJames Joseph L. Cuadra\nLyka L. Lamigo'} className="min-h-36 font-mono text-xs" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Dialog.Close asChild><Button type="button" variant="outline" size="sm">Cancel</Button></Dialog.Close>
          <Button type="button" size="sm" disabled={!count} onClick={submit} className="bg-emerald-600 text-white hover:bg-emerald-500"><ListPlus className="size-3.5" />Add {count} awardee{count !== 1 ? 's' : ''}</Button>
        </div>
      </div>
    </Shell>
  )
}

export function BulkAddNonAcademicDialog({ onAdd }: { onAdd: (e: NonAcademicEntry[]) => void }) {
  const [open, setOpen] = useState(false)
  const [award, setAward] = useState('')
  const [category, setCategory] = useState('')
  const [namesRaw, setNamesRaw] = useState('')
  const names = parseNames(namesRaw)
  const count = names.length

  const submit = () => {
    if (!count) return
    onAdd(names.map((name) => ({ id: crypto.randomUUID(), name, award: award || 'Award', category: category || 'Category' })))
    setAward(''); setCategory(''); setNamesRaw(''); setOpen(false)
  }

  return (
    <Shell open={open} onOpenChange={setOpen} title="Bulk Add Non-Academic Awards" desc="Set shared fields, then paste names (one per line)."
      trigger={
        <button type="button" className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-rose-300 px-3 py-2.5 text-xs font-medium text-rose-600 transition-all duration-200 hover:border-solid hover:bg-rose-50/50 cursor-pointer">
          <ListPlus className="size-3.5" />Bulk add names
        </button>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><SectionLabel>Award</SectionLabel><Input value={award} onChange={(e) => setAward(e.target.value)} placeholder="e.g. Leadership Award" /></div>
          <div className="space-y-1.5"><SectionLabel>Category</SectionLabel><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Individual Honors" /></div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <SectionLabel>Names (one per line)</SectionLabel>
            {count > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">{count} name{count !== 1 ? 's' : ''}</span>}
          </div>
          <Textarea value={namesRaw} onChange={(e) => setNamesRaw(e.target.value)} placeholder={'Kyla B. Bearneza\nReeman L. Singh'} className="min-h-36 font-mono text-xs" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Dialog.Close asChild><Button type="button" variant="outline" size="sm">Cancel</Button></Dialog.Close>
          <Button type="button" size="sm" disabled={!count} onClick={submit} className="bg-rose-600 text-white hover:bg-rose-500"><ListPlus className="size-3.5" />Add {count} award{count !== 1 ? 's' : ''}</Button>
        </div>
      </div>
    </Shell>
  )
}

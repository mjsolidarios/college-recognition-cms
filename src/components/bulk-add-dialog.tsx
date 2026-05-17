import { ListPlus, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { AcademicEntry, NonAcademicEntry } from '@/types/cms'

function parseNames(raw: string): string[] {
  return raw.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
}

function SectionLabel({ children }: { children: string }) {
  return <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">{children}</label>
}

function Shell({ open, onOpenChange, trigger, title, desc, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; trigger: React.ReactNode
  title: string; desc: string; children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent showClose={false}>
        <div className="flex items-start justify-between gap-3">
          <DialogHeader className="pr-0">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{desc}</DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon" className="size-7 flex-shrink-0 text-[var(--color-muted)]">
              <X className="size-4" />
            </Button>
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </Dialog>
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
        <button type="button" className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[rgb(var(--type-academic)/0.45)] px-3 py-2.5 text-xs font-medium text-[rgb(var(--type-academic))] transition-colors duration-200 hover:border-solid hover:bg-[rgb(var(--type-academic)/0.12)] cursor-pointer">
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
            {count > 0 && <span className="rounded-full bg-[rgb(var(--type-academic)/0.12)] px-2 py-0.5 text-[10px] font-semibold text-[rgb(var(--type-academic))]">{count} name{count !== 1 ? 's' : ''}</span>}
          </div>
          <Textarea value={namesRaw} onChange={(e) => setNamesRaw(e.target.value)} placeholder={'Von Ashley P. Chichirita\nJames Joseph L. Cuadra\nLyka L. Lamigo'} className="min-h-36 font-mono text-xs" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <DialogClose asChild><Button type="button" variant="outline" size="sm">Cancel</Button></DialogClose>
          <Button type="button" size="sm" disabled={!count} onClick={submit} className="border-[#1f8a65] bg-[#1f8a65] text-white hover:border-[#1a7456] hover:bg-[#1a7456]"><ListPlus className="size-3.5" />Add {count} awardee{count !== 1 ? 's' : ''}</Button>
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
        <button type="button" className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[rgb(var(--type-non-academic)/0.45)] px-3 py-2.5 text-xs font-medium text-[rgb(var(--type-non-academic))] transition-colors duration-200 hover:border-solid hover:bg-[rgb(var(--type-non-academic)/0.12)] cursor-pointer">
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
            {count > 0 && <span className="rounded-full bg-[rgb(var(--type-non-academic)/0.12)] px-2 py-0.5 text-[10px] font-semibold text-[rgb(var(--type-non-academic))]">{count} name{count !== 1 ? 's' : ''}</span>}
          </div>
          <Textarea value={namesRaw} onChange={(e) => setNamesRaw(e.target.value)} placeholder={'Kyla B. Bearneza\nReeman L. Singh'} className="min-h-36 font-mono text-xs" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <DialogClose asChild><Button type="button" variant="outline" size="sm">Cancel</Button></DialogClose>
          <Button type="button" size="sm" disabled={!count} onClick={submit} className="bg-rose-600 text-white hover:bg-rose-500"><ListPlus className="size-3.5" />Add {count} award{count !== 1 ? 's' : ''}</Button>
        </div>
      </div>
    </Shell>
  )
}

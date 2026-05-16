import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

const Select = SelectPrimitive.Root
const SelectValue = SelectPrimitive.Value

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-md border border-[var(--color-hairline)] bg-white px-4 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-primary)_20%,transparent)] focus:border-[var(--color-primary)]',
          className,
        )}
        {...props}
      >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 text-[var(--color-muted)]" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn('z-50 overflow-hidden rounded-md border border-[var(--color-hairline)] bg-white', className)}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
        className={cn(
          'relative flex cursor-default select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm text-[var(--color-ink)] outline-none data-[highlighted]:bg-[var(--surface-canvas)]',
          className,
        )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }

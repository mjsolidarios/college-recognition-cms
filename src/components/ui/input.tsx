import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-md border border-[var(--color-hairline)] bg-white px-4 py-2 text-sm text-[var(--color-ink)] outline-none transition-colors duration-200 placeholder:text-[var(--color-muted-soft)] hover:border-[var(--color-hairline-strong)] focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--color-primary)_20%,transparent)]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }

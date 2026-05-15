import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'flex min-h-20 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition-all duration-200 placeholder:text-stone-400 hover:border-stone-300 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/20',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }

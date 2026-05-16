import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium text-[var(--color-ink)] transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--color-primary)_28%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-page)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'border border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-active)] hover:border-[var(--color-primary-active)] active:bg-[var(--color-primary-active)]',
        secondary: 'border border-[var(--color-hairline-strong)] bg-white hover:bg-[var(--surface-canvas)] active:bg-[var(--surface-strong)]',
        outline: 'border border-[var(--color-hairline)] bg-white text-[var(--color-body)] hover:border-[var(--color-hairline-strong)] hover:text-[var(--color-ink)] hover:bg-[var(--surface-canvas)] active:bg-[var(--surface-strong)]',
        ghost: 'border border-transparent text-[var(--color-muted)] hover:bg-[var(--surface-canvas)] hover:text-[var(--color-ink)]',
        destructive: 'border border-[#cf2d56] bg-[#cf2d56] text-white hover:bg-[#b9264b] hover:border-[#b9264b] active:bg-[#a51f43]',
        accent: 'border border-[var(--color-hairline)] bg-[var(--surface-canvas)] text-[var(--color-body)] hover:border-[var(--color-hairline-strong)] hover:text-[var(--color-ink)]',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-6',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button }

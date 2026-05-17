import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ConfirmOptions = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type AlertOptions = {
  title: string
  description: string
  confirmLabel?: string
}

type PendingDialog =
  | {
      mode: 'confirm'
      title: string
      description: string
      confirmLabel: string
      cancelLabel: string
      destructive: boolean
      resolve: (value: boolean) => void
    }
  | {
      mode: 'alert'
      title: string
      description: string
      confirmLabel: string
      resolve: () => void
    }

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: AlertOptions) => Promise<void>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingDialog | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        mode: 'confirm',
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? 'Continue',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        destructive: options.destructive ?? false,
        resolve,
      })
    })
  }, [])

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setPending({
        mode: 'alert',
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? 'OK',
        resolve,
      })
    })
  }, [])

  const value = useMemo(() => ({ confirm, alert }), [alert, confirm])

  const close = (result: boolean) => {
    if (!pending) {
      return
    }
    if (pending.mode === 'alert') {
      pending.resolve()
    } else {
      pending.resolve(result)
    }
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            close(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pending?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {pending?.mode === 'confirm' ? (
              <AlertDialogCancel onClick={() => close(false)}>{pending.cancelLabel}</AlertDialogCancel>
            ) : null}
            <AlertDialogAction
              className={cn(
                pending?.mode === 'confirm' && pending.destructive && buttonVariants({ variant: 'destructive' }),
              )}
              onClick={() => close(true)}
            >
              {pending?.mode === 'confirm' ? pending.confirmLabel : pending?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider')
  }
  return context
}

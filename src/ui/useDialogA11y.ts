import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useDialogA11y(active: boolean, onEscape?: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const onEscapeRef = useRef(onEscape)

  useEffect(() => {
    onEscapeRef.current = onEscape
  }, [onEscape])

  useEffect(() => {
    if (!active) return
    const dialog = ref.current
    if (!dialog) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusables = () => [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
      .filter((element) => {
        if (element.hasAttribute('disabled') || element.hidden || element.closest('[aria-hidden="true"]')) return false
        const style = window.getComputedStyle(element)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })

    const first = focusables()[0] ?? dialog
    first.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const activeItem = document.activeElement
      const focusInsideDialog = activeItem instanceof Node && dialog.contains(activeItem)
      // When this dialog contains another active modal, the nested modal owns
      // keyboard handling. Otherwise both document listeners would compete and
      // the outer trap could steal Tab/Escape before the inner dialog sees it.
      if (dialog.querySelector('[role="dialog"][aria-modal="true"]')) return

      if (event.key === 'Escape' && onEscapeRef.current) {
        event.preventDefault()
        event.stopPropagation()
        onEscapeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      event.stopPropagation()

      const items = focusables()
      if (items.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const firstItem = items[0]!
      const lastItem = items[items.length - 1]!
      if (!focusInsideDialog || activeItem === dialog) {
        event.preventDefault()
        ;(event.shiftKey ? lastItem : firstItem).focus()
      } else if (event.shiftKey && activeItem === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && activeItem === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [active])

  return ref
}

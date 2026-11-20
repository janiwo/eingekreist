import type { KeyboardEvent } from 'react'

/**
 * For buttons that take the focus by themselves: a held key (Enter from the previous button)
 * must not activate them as well.
 */
export function ignoreKeyRepeat(e: KeyboardEvent) {
  if (e.repeat) e.preventDefault()
}

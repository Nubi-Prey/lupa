let isPackaged = true

try {
  const { app } = require('electron')
  isPackaged = app.isPackaged
} catch {
  isPackaged = false
}

const isDev = !isPackaged

export function log(...args: unknown[]): void {
  if (isDev) console.log(...args)
}

export function warn(...args: unknown[]): void {
  if (isDev) console.warn(...args)
}

export function logError(...args: unknown[]): void {
  console.error(...args)
}

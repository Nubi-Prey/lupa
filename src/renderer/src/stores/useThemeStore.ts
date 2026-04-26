import { create } from 'zustand'
import type { Theme } from '../../../preload/index.d'

interface ThemeState {
  theme: Theme
  resolved: 'light' | 'dark'
  init: () => Promise<void>
  setTheme: (theme: Theme) => Promise<void>
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme
}

function applyToDOM(resolved: 'light' | 'dark'): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system',
  resolved: 'light',

  init: async () => {
    const config = await window.api.config.get()
    const theme = (config.theme as Theme) || 'system'
    const resolved = resolveTheme(theme)
    applyToDOM(resolved)
    set({ theme, resolved })

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const state = useThemeStore.getState()
      if (state.theme === 'system') {
        const newResolved = getSystemTheme()
        applyToDOM(newResolved)
        set({ resolved: newResolved })
      }
    })
  },

  setTheme: async (theme) => {
    const resolved = resolveTheme(theme)
    applyToDOM(resolved)
    set({ theme, resolved })
    await window.api.config.set('theme', theme)
  }
}))

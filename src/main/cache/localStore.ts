import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { createHash } from 'crypto'
import { join } from 'path'
import { logError } from '../lib/logger'

const CACHE_DIR = app.getPath('userData')
const CACHE_FILE = join(CACHE_DIR, 'lupa-cache.json')

interface CacheData {
  services: unknown[]
  customers: unknown[]
  serviceOrders: unknown[]
  lastSync: string | null
}

interface CacheFileData extends CacheData {
  _checksum?: string
}

function getEmptyCache(): CacheData {
  return {
    services: [],
    customers: [],
    serviceOrders: [],
    lastSync: null
  }
}

function computeChecksum(data: CacheData): string {
  const copy = { ...data } as CacheFileData
  delete (copy as any)._checksum
  return createHash('sha256').update(JSON.stringify(copy)).digest('hex').slice(0, 16)
}

function validateCacheData(data: any): data is CacheFileData {
  if (!data || typeof data !== 'object') return false
  if (!Array.isArray(data.services)) return false
  if (!Array.isArray(data.customers)) return false
  if (!Array.isArray(data.serviceOrders)) return false
  return true
}

export function loadCache(): CacheData {
  try {
    if (existsSync(CACHE_FILE)) {
      const raw = readFileSync(CACHE_FILE, 'utf-8')
      const data = JSON.parse(raw)
      if (!validateCacheData(data)) {
        logError('[Cache] Invalid cache structure, resetting')
        return getEmptyCache()
      }
      if (data._checksum) {
        const expected = computeChecksum(data)
        if (data._checksum !== expected) {
          logError('[Cache] Checksum mismatch, cache may be tampered with')
          return getEmptyCache()
        }
      }
      const { _checksum, ...cache } = data
      return cache as CacheData
    }
  } catch (error) {
    logError('[Cache] Error loading cache:', error)
  }
  return getEmptyCache()
}

export function saveCache(data: CacheData): void {
  try {
    const fileData: CacheFileData = { ...data, _checksum: computeChecksum(data) }
    writeFileSync(CACHE_FILE, JSON.stringify(fileData, null, 2), 'utf-8')
  } catch (error) {
    logError('[Cache] Error saving cache:', error)
  }
}

export function updateCacheSection<K extends keyof CacheData>(key: K, items: CacheData[K]): void {
  const cache = loadCache()
  cache[key] = items
  cache.lastSync = new Date().toISOString()
  saveCache(cache)
}

export function getCachePath(): string {
  return CACHE_FILE
}

import { app, safeStorage } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { logError } from '../lib/logger'

const CONFIG_DIR = app.getPath('userData')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

export type Theme = 'light' | 'dark' | 'system'

export interface AppConfigData {
  mongodbUri: string
  theme: Theme
}

function getDefaults(): AppConfigData {
  return {
    mongodbUri: '',
    theme: 'system'
  }
}

function encryptValue(value: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(value).toString('base64')
  }
  return value
}

function decryptValue(encrypted: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    } catch {
      return encrypted
    }
  }
  return encrypted
}

function readConfig(): AppConfigData {
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = readFileSync(CONFIG_FILE, 'utf-8')
      const raw = JSON.parse(data)
      const config = { ...getDefaults(), ...raw }
      if (config.mongodbUri) {
        config.mongodbUri = decryptValue(config.mongodbUri)
      }
      return config
    }
  } catch (error) {
    logError('[Config] Error reading config:', error)
  }
  return getDefaults()
}

function writeConfig(config: AppConfigData): void {
  try {
    const toWrite = { ...config }
    if (toWrite.mongodbUri) {
      toWrite.mongodbUri = encryptValue(toWrite.mongodbUri)
    }
    writeFileSync(CONFIG_FILE, JSON.stringify(toWrite, null, 2), 'utf-8')
  } catch (error) {
    logError('[Config] Error writing config:', error)
  }
}

export function getConfig(): AppConfigData {
  return readConfig()
}

export function setConfig<K extends keyof AppConfigData>(key: K, value: AppConfigData[K]): AppConfigData {
  const config = readConfig()
  config[key] = value
  writeConfig(config)
  return config
}

export function getResolvedMongoUri(): string {
  const config = readConfig()
  return config.mongodbUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/lupa'
}

export function hasMongoUri(): boolean {
  const config = readConfig()
  return Boolean(config.mongodbUri || process.env.MONGODB_URI)
}

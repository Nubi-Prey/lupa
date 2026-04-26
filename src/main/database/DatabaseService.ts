import mongoose from 'mongoose'
import { resolveMongoUri, maskUri } from './resolver'
import { log, warn, logError } from '../lib/logger'

mongoose.set('bufferCommands', false)

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  FAILED = 'failed'
}

export interface ConnectionInfo {
  state: ConnectionState
  dbName: string
  host: string
  uri: string
  error?: string
}

const CONNECT_TIMEOUT_MS = 10000
const WAIT_READY_TIMEOUT_MS = 15000
const HEALTH_CHECK_INTERVAL_MS = 30000
const RECONNECT_BASE_DELAY_MS = 5000
const RECONNECT_MAX_DELAY_MS = 60000

type StateChangeListener = (state: ConnectionState, info: ConnectionInfo) => void

export class DatabaseService {
  private static instance: DatabaseService | null = null

  private state: ConnectionState = ConnectionState.DISCONNECTED
  private _connectionInfo: ConnectionInfo = {
    state: ConnectionState.DISCONNECTED,
    dbName: '',
    host: '',
    uri: ''
  }
  private originalUri = ''
  private resolvedUri = ''
  private connectPromise: Promise<ConnectionInfo> | null = null
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private connectTimeoutMs = CONNECT_TIMEOUT_MS
  private listeners: StateChangeListener[] = []

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  static resetInstance(): void {
    if (DatabaseService.instance) {
      DatabaseService.instance.stopHealthCheck()
      DatabaseService.instance.clearReconnect()
      DatabaseService.instance = null
    }
  }

  getState(): ConnectionState {
    return this.state
  }

  getConnectionInfo(): ConnectionInfo {
    return { ...this._connectionInfo }
  }

  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && mongoose.connection.readyState === 1
  }

  onStateChange(listener: StateChangeListener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  async initialize(uri?: string, options?: { connectTimeoutMs?: number }): Promise<ConnectionInfo> {
    this.originalUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/lupa'
    this.connectTimeoutMs = options?.connectTimeoutMs ?? CONNECT_TIMEOUT_MS

    if (this.state === ConnectionState.CONNECTED && mongoose.connection.readyState === 1) {
      return this._connectionInfo
    }

    if (this.state === ConnectionState.CONNECTING && this.connectPromise) {
      return this.connectPromise
    }

    this.connectPromise = this.doConnect()
    return this.connectPromise
  }

  private async doConnect(): Promise<ConnectionInfo> {
    this.setState(ConnectionState.CONNECTING)

    try {
      if (mongoose.connection.readyState !== 0) {
        try {
          await mongoose.disconnect()
        } catch {
          try {
            await mongoose.connection.close(true)
          } catch {
            // ignore
          }
        }
      }

      this.resolvedUri = await resolveMongoUri(this.originalUri)

      await mongoose.connect(this.resolvedUri, {
        serverSelectionTimeoutMS: this.connectTimeoutMs,
        connectTimeoutMS: this.connectTimeoutMs,
        heartbeatFrequencyMS: 10000
      })

      this.reconnectAttempts = 0
      this._connectionInfo = {
        state: ConnectionState.CONNECTED,
        dbName: mongoose.connection.name,
        host: mongoose.connection.host,
        uri: maskUri(this.originalUri)
      }

      this.setState(ConnectionState.CONNECTED)
      this.startHealthCheck()
      this.connectPromise = null

      log(`[DB] Connected to "${mongoose.connection.name}" at ${mongoose.connection.host}`)
      return this._connectionInfo
    } catch (error) {
      this._connectionInfo = {
        state: ConnectionState.FAILED,
        dbName: '',
        host: '',
        uri: maskUri(this.originalUri),
        error: String(error)
      }

      this.setState(ConnectionState.FAILED)
      this.connectPromise = null
      this.scheduleReconnect()

      logError('[DB] Connection failed:', (error as Error).message)
      throw error
    }
  }

  async whenReady(timeoutMs = WAIT_READY_TIMEOUT_MS): Promise<ConnectionInfo> {
    if (this.state === ConnectionState.CONNECTED && mongoose.connection.readyState === 1) {
      return this._connectionInfo
    }

    if (this.state === ConnectionState.CONNECTING && this.connectPromise) {
      const result: ConnectionInfo = await Promise.race([
        this.connectPromise,
        this.createTimeout<ConnectionInfo>(timeoutMs, 'Connection timed out')
      ])
      return result
    }

    return this.initialize(this.originalUri)
  }

  async execute<T>(operation: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
    try {
      if (this.state === ConnectionState.CONNECTED && mongoose.connection.readyState === 1) {
        return await operation()
      }

      if (mongoose.connection.readyState === 0 && !fallback) {
        throw new Error('Database is disconnected and no fallback provided')
      }

      if (mongoose.connection.readyState === 0 && fallback) {
        return await fallback()
      }

      await this.whenReady()
      return await operation()
    } catch (error) {
      if (fallback) {
        warn(`[DB] Operation failed, using fallback:`, (error as Error).message)
        return await fallback()
      }
      throw error
    }
  }

  async disconnect(): Promise<void> {
    this.clearReconnect()
    this.stopHealthCheck()

    const readyState = mongoose.connection.readyState

    if (readyState === 0) {
      this.setState(ConnectionState.DISCONNECTED)
      return
    }

    if (readyState === 2) {
      try {
        await mongoose.connection.close(true)
      } catch {
        // force close
      }
      this.setState(ConnectionState.DISCONNECTED)
      return
    }

    try {
      await mongoose.disconnect()
    } catch {
      try {
        await mongoose.connection.close(true)
      } catch {
        // ignore
      }
    }

    this.setState(ConnectionState.DISCONNECTED)
    this.connectPromise = null
    this.reconnectAttempts = 0
  }

  private setState(newState: ConnectionState): void {
    const oldState = this.state
    this.state = newState
    this._connectionInfo.state = newState

    if (oldState !== newState) {
      for (const listener of this.listeners) {
        try {
          listener(newState, this._connectionInfo)
        } catch {
          // ignore listener errors
        }
      }
    }
  }

  private startHealthCheck(): void {
    this.stopHealthCheck()
    this.healthCheckTimer = setInterval(async () => {
      if (this.state !== ConnectionState.CONNECTED) return

      try {
        await mongoose.connection.db!.admin().ping()
      } catch {
        warn('[DB] Health check failed')
        this.setState(ConnectionState.FAILED)
        this._connectionInfo.error = 'Health check ping failed'
        this.scheduleReconnect()
      }
    }, HEALTH_CHECK_INTERVAL_MS)
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnect()
    this.stopHealthCheck()

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY_MS
    )
    this.reconnectAttempts++

    log(`[DB] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.initialize(this.originalUri)
      } catch {
        // scheduleReconnect will be called again by doConnect on failure
      }
    }, delay)
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private createTimeout<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  }
}

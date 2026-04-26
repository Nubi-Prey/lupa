import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { DatabaseService, ConnectionState } from './DatabaseService'

const MONGODB_URI = process.env.MONGODB_URI

const atlasDescribe = MONGODB_URI ? describe : describe.skip

atlasDescribe('DatabaseService (Atlas)', () => {
  let db: DatabaseService

  beforeAll(() => {
    DatabaseService.resetInstance()
    db = DatabaseService.getInstance()
  })

  afterAll(async () => {
    await DatabaseService.getInstance().disconnect()
    DatabaseService.resetInstance()
  })

  it('deve conectar com sucesso ao MongoDB Atlas via DNS resolver', async () => {
    const info = await db.initialize(MONGODB_URI)

    expect(info.state).toBe(ConnectionState.CONNECTED)
    expect(info.dbName).toBeDefined()
    expect(info.dbName).not.toBe('')
    expect(info.host).toBeDefined()
    expect(info.host).not.toBe('')
  }, 60000)

  it('deve ser idempotente (initialize 2x = mesma conexão)', async () => {
    const info1 = await db.initialize(MONGODB_URI)
    const info2 = await db.initialize(MONGODB_URI)

    expect(info1.state).toBe(ConnectionState.CONNECTED)
    expect(info2.state).toBe(ConnectionState.CONNECTED)
  })

  it('deve executar operação quando conectado', async () => {
    const result = await db.execute(async () => {
      return { ping: 'pong' }
    })
    expect(result).toEqual({ ping: 'pong' })
  })

  it('deve usar fallback quando operação falha', async () => {
    const result = await db.execute(
      async () => {
        throw new Error('operation failed')
      },
      () => 'fallback value'
    )
    expect(result).toBe('fallback value')
  })

  it('deve notificar listeners em mudança de estado', async () => {
    const states: ConnectionState[] = []
    const unsubscribe = db.onStateChange((state) => {
      states.push(state)
    })

    await db.disconnect()
    await db.initialize(MONGODB_URI)

    unsubscribe()

    expect(states).toContain(ConnectionState.DISCONNECTED)
    expect(states).toContain(ConnectionState.CONNECTING)
    expect(states).toContain(ConnectionState.CONNECTED)
  }, 60000)

  it('deve reconectar após desconectar', async () => {
    await db.disconnect()
    expect(db.isConnected()).toBe(false)

    const info = await db.initialize(MONGODB_URI)
    expect(info.state).toBe(ConnectionState.CONNECTED)
    expect(db.isConnected()).toBe(true)
  }, 60000)
})

describe('DatabaseService (falhas e fallback)', () => {
  afterEach(async () => {
    await DatabaseService.getInstance().disconnect()
    DatabaseService.resetInstance()
  })

  it('deve ir para estado FAILED após URI inválida', async () => {
    const db = DatabaseService.getInstance()
    try {
      await db.initialize('mongodb://invalid-host-99999:27017/lupa', {
        connectTimeoutMs: 1000
      })
    } catch {
      // expected
    }
    expect(db.getState()).toBe(ConnectionState.FAILED)
    expect(db.isConnected()).toBe(false)
  }, 10000)

  it('deve usar fallback quando desconectado, ou lançar erro sem fallback', async () => {
    const db = DatabaseService.getInstance()

    const result = await db.execute(
      async () => 'should not work',
      () => 'fallback works'
    )
    expect(result).toBe('fallback works')

    await expect(db.execute(async () => 'should not work')).rejects.toThrow()
  })

  it('deve desconectar sem travar quando no estado CONNECTING', async () => {
    const db = DatabaseService.getInstance()
    const connectPromise = db.initialize('mongodb://invalid-host-99999:27017/lupa', {
      connectTimeoutMs: 1000
    })

    const start = Date.now()
    await db.disconnect()
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(3000)
    expect(db.getState()).toBe(ConnectionState.DISCONNECTED)

    try {
      await connectPromise
    } catch {
      // may reject, that's fine
    }
  }, 10000)
})

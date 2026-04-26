import { describe, it, expect } from 'vitest'
import dns from 'dns'
import { resolveMongoUri } from './resolver'

describe('resolver', () => {
  it('deve retornar URI inalterada se não for mongodb+srv', async () => {
    const uri = 'mongodb://user:pass@host1:27017,host2:27017/lupa?retryWrites=true'
    const result = await resolveMongoUri(uri)
    expect(result).toBe(uri)
  })

  it('deve converter mongodb+srv para mongodb com hosts resolvidos', async () => {
    const uri =
      'mongodb+srv://user:pass@cluster0.xvywrid.mongodb.net/lupa?retryWrites=true&w=majority'
    const result = await resolveMongoUri(uri)

    expect(result).toMatch(/^mongodb:\/\//)
    expect(result).not.toContain('mongodb+srv://')
    expect(result).toContain('user:pass@')
    expect(result).toContain(':27017')
    expect(result).toContain('/lupa')
    expect(result).toContain('retryWrites=true')
  }, 20000)

  it('deve preservar params do usuário sobre os defaults implícitos do SRV', async () => {
    const originalResolveSrv = dns.promises.resolveSrv
    const originalResolveTxt = dns.promises.resolveTxt

    dns.promises.resolveSrv = async () => [
      { name: 'host1.example.com', port: 27017, priority: 0, weight: 0 }
    ]
    dns.promises.resolveTxt = async () => [['authSource=admin']]

    try {
      const uri = 'mongodb+srv://user:pass@cluster.example.com/db?tls=false&authSource=custom'
      const result = await resolveMongoUri(uri)

      // user params devem ter prioridade sobre defaults e TXT
      expect(result).toContain('tls=false')
      expect(result).not.toContain('tls=true')
      expect(result).toContain('authSource=custom')
      expect(result).not.toContain('authSource=admin')
    } finally {
      dns.promises.resolveSrv = originalResolveSrv
      dns.promises.resolveTxt = originalResolveTxt
    }
  }, 10000)

  it('deve juntar múltiplos TXT records (não apenas authSource)', async () => {
    const originalResolveSrv = dns.promises.resolveSrv
    const originalResolveTxt = dns.promises.resolveTxt

    dns.promises.resolveSrv = async () => [
      { name: 'host1.example.com', port: 27017, priority: 0, weight: 0 }
    ]
    dns.promises.resolveTxt = async () => [['replicaSet=atlas-xxx-shard-0&authSource=admin']]

    try {
      const uri = 'mongodb+srv://user:pass@cluster.example.com/db'
      const result = await resolveMongoUri(uri)

      expect(result).toContain('replicaSet=atlas-xxx-shard-0')
      expect(result).toContain('authSource=admin')
      expect(result).toContain('tls=true')
    } finally {
      dns.promises.resolveSrv = originalResolveSrv
      dns.promises.resolveTxt = originalResolveTxt
    }
  }, 10000)

  it('deve usar fallback DNS se DNS do sistema falhar', async () => {
    const originalResolveSrv = dns.promises.resolveSrv
    let systemCalled = false

    dns.promises.resolveSrv = async () => {
      systemCalled = true
      throw new Error('system DNS failed')
    }

    try {
      const uri = 'mongodb+srv://user:pass@cluster0.xvywrid.mongodb.net/lupa'
      const result = await resolveMongoUri(uri)
      expect(systemCalled).toBe(true)
      expect(result).toMatch(/^mongodb:\/\//)
    } finally {
      dns.promises.resolveSrv = originalResolveSrv
    }
  }, 30000)

  it('deve retornar URI original se nenhuma resolução funcionar', async () => {
    const originalResolveSrv = dns.promises.resolveSrv
    dns.promises.resolveSrv = async () => {
      throw new Error('DNS failed')
    }

    try {
      const uri = 'mongodb+srv://user:pass@nonexistent.invalid.mongodb.net/lupa'
      const result = await resolveMongoUri(uri)
      expect(result).toBe(uri)
    } finally {
      dns.promises.resolveSrv = originalResolveSrv
    }
  }, 30000)
})

import dns from 'dns'
import { log, warn } from '../lib/logger'

const DNS_TIMEOUT_MS = 5000
const FALLBACK_SERVERS = ['8.8.8.8', '1.1.1.1', '8.8.4.4']

interface SrvRecord {
  name: string
  port: number
}

function parseSrvUri(uri: string): {
  protocol: string
  credentials: string
  clusterName: string
  dbName: string
  params: string
} | null {
  const match = uri.match(/^(mongodb\+srv):\/\/([^@]+)@([^/]+)(?:\/([^?]*))?(?:\?(.*))?$/)
  if (!match) return null
  return {
    protocol: match[1],
    credentials: match[2],
    clusterName: match[3],
    dbName: match[4] || '',
    params: match[5] || ''
  }
}

async function resolveSrvWithServer(clusterName: string, dnsServer: string): Promise<SrvRecord[]> {
  const resolver = new dns.promises.Resolver()
  resolver.setServers([dnsServer])

  const srvRecordName = `_mongodb._tcp.${clusterName}`
  const records = await Promise.race([
    resolver.resolveSrv(srvRecordName),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DNS timeout')), DNS_TIMEOUT_MS)
    )
  ])

  return records.map((r) => ({ name: r.name, port: r.port }))
}

async function resolveSrvSystem(clusterName: string): Promise<SrvRecord[]> {
  const srvRecordName = `_mongodb._tcp.${clusterName}`
  const records = await dns.promises.resolveSrv(srvRecordName)
  return records.map((r) => ({ name: r.name, port: r.port }))
}

async function resolveTxtWithServer(clusterName: string, dnsServer: string): Promise<string[]> {
  const resolver = new dns.promises.Resolver()
  resolver.setServers([dnsServer])

  try {
    const records = await Promise.race([
      resolver.resolveTxt(clusterName),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), DNS_TIMEOUT_MS)
      )
    ])
    return records.flat()
  } catch {
    return []
  }
}

async function resolveTxtSystem(clusterName: string): Promise<string[]> {
  try {
    const records = await dns.promises.resolveTxt(clusterName)
    return records.flat()
  } catch {
    return []
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`DNS resolution timed out after ${ms}ms`)), ms)
    promise.then(
      (val) => {
        clearTimeout(timer)
        resolve(val)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

async function resolveSrvRecords(clusterName: string): Promise<SrvRecord[]> {
  const errors: Error[] = []

  try {
    const records = await withTimeout(resolveSrvSystem(clusterName), DNS_TIMEOUT_MS)
    if (records.length > 0) return records
  } catch (e) {
    errors.push(e as Error)
  }

  for (const server of FALLBACK_SERVERS) {
    try {
      const records = await withTimeout(resolveSrvWithServer(clusterName, server), DNS_TIMEOUT_MS)
      if (records.length > 0) {
        log(`[DNS] SRV resolved via fallback server ${server}`)
        return records
      }
    } catch (e) {
      errors.push(e as Error)
    }
  }

  warn('[DNS] All SRV resolution attempts failed:', errors.map((e) => e.message).join('; '))
  return []
}

async function resolveTxtRecords(clusterName: string): Promise<string> {
  let txtRecords: string[] = []

  try {
    txtRecords = await withTimeout(resolveTxtSystem(clusterName), DNS_TIMEOUT_MS)
  } catch {
    // try fallback
  }

  if (txtRecords.length === 0) {
    for (const server of FALLBACK_SERVERS) {
      try {
        txtRecords = await withTimeout(resolveTxtWithServer(clusterName, server), DNS_TIMEOUT_MS)
        if (txtRecords.length > 0) break
      } catch {
        continue
      }
    }
  }

  return txtRecords.filter(Boolean).join('&')
}

// Parâmetros implícitos do mongodb+srv:// que o driver aplica automaticamente.
// Quando convertemos para mongodb://, precisamos torná-los explícitos.
const SRV_IMPLICIT_DEFAULTS: Record<string, string> = {
  tls: 'true',
  authSource: 'admin'
}

export function maskUri(uri: string): string {
  return uri.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@')
}

export async function resolveMongoUri(uri: string): Promise<string> {
  if (!uri.startsWith('mongodb+srv://')) return uri

  const parsed = parseSrvUri(uri)
  if (!parsed) {
    warn('[DNS] Could not parse mongodb+srv URI, using as-is')
    return uri
  }

  const srvRecords = await resolveSrvRecords(parsed.clusterName)

  if (srvRecords.length === 0) {
    warn('[DNS] No SRV records found, using original URI')
    return uri
  }

  const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(',')
  const txtExtra = await resolveTxtRecords(parsed.clusterName)

  // Precedência (menor → maior):
  // 1. Defaults implícitos do SRV (tls=true, authSource=admin)
  // 2. TXT records (Atlas pode sobrescrever authSource, definir replicaSet, etc.)
  // 3. Params do usuário na URI original (máxima prioridade)
  const finalParams = new URLSearchParams(SRV_IMPLICIT_DEFAULTS)

  const txtParams = new URLSearchParams(txtExtra)
  txtParams.forEach((v, k) => finalParams.set(k, v))

  const userParams = new URLSearchParams(parsed.params)
  userParams.forEach((v, k) => finalParams.set(k, v))

  const paramStr = finalParams.toString() ? `?${finalParams.toString()}` : ''
  const dbStr = parsed.dbName ? `/${parsed.dbName}` : ''

  const resolvedUri = `mongodb://${parsed.credentials}@${hosts}${dbStr}${paramStr}`
  log(`[DNS] Resolved mongodb+srv → ${hosts.split(',').length} hosts`)
  log(`[DNS] Resolved URI (masked): ${maskUri(resolvedUri)}`)
  return resolvedUri
}

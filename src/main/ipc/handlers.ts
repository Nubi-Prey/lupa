import { ipcMain, BrowserWindow } from 'electron'
import mongoose from 'mongoose'
import { DatabaseService, ConnectionState } from '../database/DatabaseService'
import { ServiceModel } from '../database/models/Service'
import { CustomerModel } from '../database/models/Customer'
import { ServiceOrderModel } from '../database/models/ServiceOrder'
import { getNextOsNumber } from '../database/models/Counter'
import { loadCache, updateCacheSection } from '../cache/localStore'
import { getConfig, setConfig, hasMongoUri } from '../config/AppConfig'

const VALID_STATUSES = ['quote', 'pending', 'in_progress', 'ready', 'delivered'] as const
const VALID_CONFIG_KEYS = ['mongodbUri', 'theme'] as const

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id).toString() === id
}

function validateId(id: unknown): string {
  if (typeof id !== 'string' || !isValidObjectId(id)) {
    throw new Error('Invalid ID format')
  }
  return id
}

function validateStatus(status: unknown): string {
  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as any)) {
    throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`)
  }
  return status
}

function serialize(doc: any): any {
  if (!doc) return doc
  if (doc instanceof Date) return doc.toISOString()
  if (Array.isArray(doc)) return doc.map(serialize)
  if (doc && typeof doc === 'object') {
    const { _id, __v, ...rest } = doc
    const result: any = _id ? { id: String(_id) } : {}
    for (const key of Object.keys(rest)) {
      result[key] = serialize(rest[key])
    }
    return result
  }
  return doc
}

function stripInternalFields(data: any): any {
  if (!data || typeof data !== 'object') return data
  if (Array.isArray(data)) return data.map(stripInternalFields)
  const { _id, __v, id, ...rest } = data
  const result: any = {}
  for (const key of Object.keys(rest)) {
    result[key] = stripInternalFields(rest[key])
  }
  return result
}

export function registerIpcHandlers(db: DatabaseService): void {
  ipcMain.handle('db:connect', async () => {
    try {
      const info = await db.initialize()
      return info
    } catch (error) {
      return {
        state: ConnectionState.FAILED,
        dbName: '',
        host: '',
        uri: '',
        error: String(error)
      }
    }
  })

  ipcMain.handle('db:disconnect', async () => {
    try {
      await db.disconnect()
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:getState', () => {
    return db.getConnectionInfo()
  })

  // ---- Services ----
  ipcMain.handle('services:findAll', () =>
    db.execute(
      async () => {
        const services = serialize(await ServiceModel.find().lean())
        updateCacheSection('services', services)
        return services
      },
      () => loadCache().services
    )
  )

  ipcMain.handle('services:create', (_, data) =>
    db.execute(async () => {
      const service = await ServiceModel.create(data)
      const all = serialize(await ServiceModel.find().lean())
      updateCacheSection('services', all)
      return serialize(service.toObject())
    })
  )

  ipcMain.handle('services:update', (_, id, data) =>
    db.execute(async () => {
      validateId(id)
      const service = serialize(await ServiceModel.findByIdAndUpdate(id, { $set: stripInternalFields(data) }, { returnDocument: 'after' }).lean())
      const all = serialize(await ServiceModel.find().lean())
      updateCacheSection('services', all)
      return service
    })
  )

  ipcMain.handle('services:delete', (_, id) =>
    db.execute(async () => {
      validateId(id)
      await ServiceModel.findByIdAndDelete(id)
      const all = serialize(await ServiceModel.find().lean())
      updateCacheSection('services', all)
      return { success: true }
    })
  )

  // ---- Customers ----
  ipcMain.handle('customers:findAll', () =>
    db.execute(
      async () => {
        const customers = serialize(await CustomerModel.find().lean())
        updateCacheSection('customers', customers)
        return customers
      },
      () => loadCache().customers
    )
  )

  ipcMain.handle('customers:create', (_, data) =>
    db.execute(async () => {
      const customer = await CustomerModel.create(data)
      const all = serialize(await CustomerModel.find().lean())
      updateCacheSection('customers', all)
      return serialize(customer.toObject())
    })
  )

  ipcMain.handle('customers:update', (_, id, data) =>
    db.execute(async () => {
      validateId(id)
      const customer = serialize(
        await CustomerModel.findByIdAndUpdate(id, { $set: stripInternalFields(data) }, { returnDocument: 'after' }).lean()
      )
      const all = serialize(await CustomerModel.find().lean())
      updateCacheSection('customers', all)
      return customer
    })
  )

  ipcMain.handle('customers:delete', (_, id) =>
    db.execute(async () => {
      validateId(id)
      await CustomerModel.findByIdAndDelete(id)
      const all = serialize(await CustomerModel.find().lean())
      updateCacheSection('customers', all)
      return { success: true }
    })
  )

  // ---- Service Orders ----
  ipcMain.handle('orders:findAll', () =>
    db.execute(
      async () => {
        const orders = serialize(await ServiceOrderModel.find().sort({ osNumber: -1 }).lean())
        updateCacheSection('serviceOrders', orders)
        return orders
      },
      () => loadCache().serviceOrders
    )
  )

  ipcMain.handle('orders:findById', (_, id) =>
    db.execute(async () => {
      validateId(id)
      return serialize(await ServiceOrderModel.findById(id).lean())
    })
  )

  ipcMain.handle('orders:create', (_, data) =>
    db.execute(async () => {
      const osNumber = await getNextOsNumber()
      const order = await ServiceOrderModel.create({ ...data, osNumber })
      const all = serialize(await ServiceOrderModel.find().sort({ osNumber: -1 }).lean())
      updateCacheSection('serviceOrders', all)
      return serialize(order.toObject())
    })
  )

  ipcMain.handle('orders:update', (_, id, data) =>
    db.execute(async () => {
      validateId(id)
      const order = serialize(
        await ServiceOrderModel.findByIdAndUpdate(id, { $set: stripInternalFields(data) }, { returnDocument: 'after' }).lean()
      )
      const all = serialize(await ServiceOrderModel.find().sort({ osNumber: -1 }).lean())
      updateCacheSection('serviceOrders', all)
      return order
    })
  )

  ipcMain.handle('orders:updateStatus', (_, id, status) =>
    db.execute(async () => {
      validateId(id)
      const validStatus = validateStatus(status)
      const updateData: Record<string, unknown> = { status: validStatus }
      if (validStatus === 'delivered') {
        updateData['dates.finished'] = new Date()
      }
      const order = serialize(
        await ServiceOrderModel.findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after' }).lean()
      )
      const all = serialize(await ServiceOrderModel.find().sort({ osNumber: -1 }).lean())
      updateCacheSection('serviceOrders', all)
      return order
    })
  )

  ipcMain.handle('orders:delete', (_, id) =>
    db.execute(async () => {
      validateId(id)
      await ServiceOrderModel.findByIdAndDelete(id)
      const all = serialize(await ServiceOrderModel.find().sort({ osNumber: -1 }).lean())
      updateCacheSection('serviceOrders', all)
      return { success: true }
    })
  )

  // ---- Cache ----
  ipcMain.handle('cache:load', () => {
    return loadCache()
  })

  // ---- Config ----
  ipcMain.handle('config:get', () => {
    return getConfig()
  })

  ipcMain.handle('config:set', (_, key: string, value: unknown) => {
    if (!VALID_CONFIG_KEYS.includes(key as any)) {
      throw new Error(`Invalid config key: ${key}`)
    }
    const updated = setConfig(key as any, value)
    if (key === 'mongodbUri' && typeof value === 'string') {
      const has = hasMongoUri()
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('config:uri-change', has)
      })
      db.disconnect().catch(() => {})
      db.initialize(value).catch(() => {})
    }
    return updated
  })

  ipcMain.handle('config:hasDbUri', () => {
    return hasMongoUri()
  })
}

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DatabaseService } from '../DatabaseService'
import { ServiceOrderModel } from './ServiceOrder'
import { ServiceModel } from './Service'
import { CustomerModel } from './Customer'

const MONGODB_URI = process.env.MONGODB_URI?.replace(/\/lupa/, '/test')

const atlasDescribe = MONGODB_URI ? describe : describe.skip

atlasDescribe('Database Models', () => {
  let db: DatabaseService

  beforeAll(async () => {
    DatabaseService.resetInstance()
    db = DatabaseService.getInstance()
    await db.initialize(MONGODB_URI)
    if (db.isConnected()) {
      await ServiceOrderModel.createIndexes()
      await ServiceModel.createIndexes()
      await CustomerModel.createIndexes()
    }
  }, 60000)

  afterAll(async () => {
    if (db.isConnected()) {
      await ServiceOrderModel.deleteMany({}).catch(() => {})
      await ServiceModel.deleteMany({}).catch(() => {})
      await CustomerModel.deleteMany({}).catch(() => {})
    }
    await db.disconnect()
    DatabaseService.resetInstance()
  })

  describe('ServiceOrder (Schema)', () => {
    beforeAll(async () => {
      if (db.isConnected()) {
        await ServiceOrderModel.deleteMany({})
      }
    })

    it('deve criar uma ordem de serviço com osNumber', async () => {
      const lastOrder = await ServiceOrderModel.findOne().sort({ osNumber: -1 }).lean()
      const osNumber = (lastOrder?.osNumber || 0) + 1

      const order = await ServiceOrderModel.create({
        osNumber,
        customer: { name: 'João Silva', phone: '11999999999' },
        items: [{ description: 'Solda de corrente', price: 50 }],
        status: 'pending',
        dates: {
          created: new Date(),
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        financial: { total: 50, deposit: 0, balance: 50 }
      })

      expect(order.osNumber).toBe(osNumber)
      expect(order.customer!.name).toBe('João Silva')
      expect(order.items).toHaveLength(1)
      expect(order.status).toBe('pending')
      expect(order.financial!.total).toBe(50)
    })

    it('deve criar segunda ordem com osNumber sequencial', async () => {
      const lastOrder = await ServiceOrderModel.findOne().sort({ osNumber: -1 }).lean()
      const osNumber = (lastOrder?.osNumber || 0) + 1

      await ServiceOrderModel.create({
        osNumber,
        customer: { name: 'Maria Souza', phone: '11888888888' },
        items: [
          { description: 'Limpeza de anel', price: 30 },
          { description: 'Polimento', price: 20 }
        ],
        status: 'in_progress',
        dates: {
          created: new Date(),
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        },
        financial: { total: 50, deposit: 25, balance: 25 }
      })

      const all = await ServiceOrderModel.find().sort({ osNumber: 1 }).lean()
      expect(all).toHaveLength(2)
      expect(all[1].osNumber).toBe(all[0].osNumber + 1)
    })

    it('deve rejeitar criação sem campos obrigatórios', async () => {
      await expect(ServiceOrderModel.create({ osNumber: 995 })).rejects.toThrow()
    })

    it('deve rejeitar status inválido', async () => {
      const order = new ServiceOrderModel({
        osNumber: 994,
        customer: { name: 'Test', phone: '11111111111' },
        items: [{ description: 'Test', price: 1 }],
        status: 'invalid_status',
        dates: { created: new Date(), deadline: new Date() },
        financial: { total: 1, deposit: 0, balance: 1 }
      })
      await expect(order.save()).rejects.toThrow()
    })
  })

  describe('Service Model', () => {
    beforeAll(async () => {
      if (db.isConnected()) {
        await ServiceModel.deleteMany({})
      }
    })

    it('deve criar um serviço com tags', async () => {
      const service = await ServiceModel.create({
        label: 'Solda de corrente de prata',
        category: 'Conserto',
        basePrice: 50,
        tags: ['solda', 'prata', 'corrente']
      })
      expect(service.label).toBe('Solda de corrente de prata')
      expect(service.tags).toHaveLength(3)
    })

    it('deve rejeitar serviço sem label', async () => {
      await expect(ServiceModel.create({ category: 'Conserto', basePrice: 10 })).rejects.toThrow()
    })
  })

  describe('Customer Model', () => {
    beforeAll(async () => {
      if (db.isConnected()) {
        await CustomerModel.deleteMany({})
      }
    })

    it('deve rejeitar cliente sem nome', async () => {
      await expect(CustomerModel.create({ phone: '11999999999' })).rejects.toThrow()
    })

    it('deve buscar cliente por texto (text index)', async () => {
      await CustomerModel.create({ name: 'Fernanda Oliveira', phone: '11333333333' })
      const results = await CustomerModel.find({ $text: { $search: 'Fernanda' } }).lean()
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name).toBe('Fernanda Oliveira')
    })
  })
})

import mongoose from 'mongoose'
import { ServiceOrderModel } from './ServiceOrder'

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  }
)

const CounterModel = mongoose.model('Counter', counterSchema)

export async function getNextOsNumber(): Promise<number> {
  let counter = await CounterModel.findById('osNumber')

  if (!counter) {
    const lastOrder = await ServiceOrderModel.findOne().sort({ osNumber: -1 }).lean()
    const maxOsNumber = lastOrder?.osNumber || 0
    counter = await CounterModel.create({ _id: 'osNumber', seq: maxOsNumber })
  }

  const updated = await CounterModel.findByIdAndUpdate(
    'osNumber',
    { $inc: { seq: 1 } },
    { returnDocument: 'after' }
  )
  return updated!.seq
}

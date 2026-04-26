import mongoose from 'mongoose'

const serviceOrderSchema = new mongoose.Schema(
  {
    osNumber: { type: Number, required: true, unique: true },
    customer: {
      name: { type: String, required: true, trim: true, maxlength: 200 },
      phone: { type: String, required: true, trim: true, maxlength: 15 }
    },
    items: [
      {
        description: { type: String, required: true, trim: true, maxlength: 300 },
        quantity: { type: Number, required: true, default: 1, min: 1 },
        price: { type: Number, required: true, default: 0, min: 0 }
      }
    ],
    status: {
      type: String,
      enum: ['quote', 'pending', 'in_progress', 'ready', 'delivered'],
      default: 'pending'
    },
    dates: {
      created: { type: Date, default: Date.now },
      deadline: { type: Date, required: true },
      finished: { type: Date }
    },
    financial: {
      total: { type: Number, required: true, default: 0, min: 0 },
      deposit: { type: Number, default: 0, min: 0 },
      balance: { type: Number, default: 0 }
    },
    attachments: { type: [String], default: [] },
    notes: { type: String, default: '', trim: true, maxlength: 2000 }
  },
  { timestamps: true }
)

serviceOrderSchema.index({ 'customer.name': 'text' })

export const ServiceOrderModel = mongoose.model('ServiceOrder', serviceOrderSchema)

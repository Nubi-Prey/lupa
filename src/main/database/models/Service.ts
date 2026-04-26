import mongoose from 'mongoose'

const serviceSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, required: true, trim: true, maxlength: 50 },
    basePrice: { type: Number, required: true, default: 0, min: 0 },
    tags: { type: [String], default: [], validate: (v: string[]) => v.length <= 20 }
  },
  { timestamps: true }
)

export const ServiceModel = mongoose.model('Service', serviceSchema)

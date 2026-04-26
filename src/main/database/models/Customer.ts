import mongoose from 'mongoose'

const PHONE_REGEX = /^\d{10,13}$/

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 15,
      validate: {
        validator: (v: string) => PHONE_REGEX.test(v.replace(/\D/g, '')),
        message: 'Invalid phone number format'
      }
    },
    email: { type: String, default: '', trim: true, maxlength: 200 },
    address: { type: String, default: '', trim: true, maxlength: 500 },
    notes: { type: String, default: '', trim: true, maxlength: 2000 }
  },
  { timestamps: true }
)

customerSchema.index({ name: 'text', phone: 'text' })

export const CustomerModel = mongoose.model('Customer', customerSchema)

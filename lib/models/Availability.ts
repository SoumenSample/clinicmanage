import mongoose, { Schema, Document } from 'mongoose';

export interface IAvailability extends Document {
  tenantId: Schema.Types.ObjectId;
  doctorId?: Schema.Types.ObjectId; // user-based doctor
  doctorProfileId?: Schema.Types.ObjectId; // profile-only doctor
  start: Date;
  end: Date;
  slotInterval?: number;
  recurrence?: {
    type: 'none' | 'daily' | 'weekly' | 'monthly';
    interval?: number; // every N days/weeks/months
    days?: number[]; // for weekly: 0 (Sun) - 6 (Sat)
    until?: Date; // recurrence end
  };
  createdBy?: Schema.Types.ObjectId;
}

const AvailabilitySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    doctorProfileId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: false, index: true },
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true },
    slotInterval: { type: Number, default: 15 },
    recurrence: {
      type: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly'],
        default: 'none',
      },
      interval: { type: Number, default: 1 },
      days: { type: [Number], default: [] },
      until: { type: Date },
    },
    exceptions: { type: [Date], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

AvailabilitySchema.index({ tenantId: 1, doctorId: 1, start: 1 });
AvailabilitySchema.index({ tenantId: 1, doctorProfileId: 1, start: 1 });

export default mongoose.models.Availability || mongoose.model<IAvailability>('Availability', AvailabilitySchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctor extends Document {
  tenantId: Schema.Types.ObjectId;
  name: string;
  specialization: string;
  degree?: string;
  clinicName?: string;
  clinicAddress?: string;
  phone?: string;
  email?: string;
  registrationNumber?: string;
  notes?: string;
}

const DoctorSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: true,
      trim: true,
    },
    degree: {
      type: String,
      trim: true,
    },
    clinicName: {
      type: String,
      trim: true,
    },
    clinicAddress: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    notes: String,
  },
  { timestamps: true }
);

DoctorSchema.index({ tenantId: 1, name: 1 });
DoctorSchema.index({ tenantId: 1, specialization: 1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.Doctor) {
  delete mongoose.models.Doctor;
}

export default mongoose.models.Doctor || mongoose.model<IDoctor>('Doctor', DoctorSchema);
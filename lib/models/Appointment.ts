import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  tenantId: Schema.Types.ObjectId;
  doctorId: Schema.Types.ObjectId;
  doctorProfileId?: Schema.Types.ObjectId;
  patientId: Schema.Types.ObjectId;
  patientProfileId?: Schema.Types.ObjectId;
  dateTime: Date;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  duration: number; // in minutes
  createdAt: Date;
}

const AppointmentSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    doctorProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: false,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    patientProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: false,
      index: true,
    },
    dateTime: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled',
    },
    notes: {
      type: String,
      default: null,
    },
    duration: {
      type: Number,
      default: 30, // 30 minutes default
    },
  },
  { timestamps: true }
);

AppointmentSchema.index({ tenantId: 1, dateTime: 1 });
AppointmentSchema.index({ tenantId: 1, doctorId: 1, dateTime: 1 });
AppointmentSchema.index({ tenantId: 1, patientId: 1, dateTime: 1 });
AppointmentSchema.index({ tenantId: 1, doctorProfileId: 1, dateTime: 1 });
AppointmentSchema.index({ tenantId: 1, patientProfileId: 1, dateTime: 1 });

export default mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema);

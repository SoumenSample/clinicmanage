import mongoose, { Schema, Document } from 'mongoose';

export type AlertCategory =
  | 'appointments'
  | 'billing'
  | 'doctors'
  | 'prescriptions'
  | 'patients'
  | 'inventory'
  | 'system';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface IAlert extends Document {
  tenantId: Schema.Types.ObjectId;
  title: string;
  message: string;
  category: AlertCategory;
  severity: AlertSeverity;
  entityType?: string;
  entityId?: string;
  isResolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['appointments', 'billing', 'doctors', 'prescriptions', 'patients', 'inventory', 'system'],
      default: 'system',
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
    entityType: {
      type: String,
      default: null,
    },
    entityId: {
      type: String,
      default: null,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

AlertSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);

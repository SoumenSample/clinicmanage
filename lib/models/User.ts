import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  tenantId?: Schema.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  role: 'owner' | 'admin' | 'receptionist' | 'cashier' | 'inventory_manager' | 'doctor' | 'patient' | 'staff';
  isVerified?: boolean;
  otp?: string | null;
  otpExpires?: Date | null;
  createdAt: Date;
}

const UserSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'receptionist', 'cashier', 'inventory_manager', 'doctor', 'patient', 'staff'],
      default: 'staff',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true, sparse: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

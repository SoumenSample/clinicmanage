import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/lib/models/Appointment';
import { withAuth, withStaffAuth } from '@/middleware/auth';
import { z } from 'zod';

const updateAppointmentSchema = z.object({
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no-show']).optional(),
  notes: z.string().optional(),
  dateTime: z.string().datetime().optional(),
  duration: z.number().min(15).max(480).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    try {
      await connectDB();
      const { id } = await params;
      const auth = (request as any).user;

      // Build base query
      const query: any = { _id: id, tenantId: auth?.tenantId };
      // If patient, restrict to their own appointment
      if (auth?.role === 'patient') {
        query.$or = [{ patientId: auth.userId }, { patientProfileId: auth.userId }];
      }

      const appointment = await Appointment.findOne(query)
        .populate('doctorId', 'name email')
        .populate('doctorProfileId', 'name email')
        .populate('patientId', 'name email')
        .populate('patientProfileId', 'name email');

      if (!appointment) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }

      let doctorIdOut = null;
      let doctorName = '';
      let doctorSource: 'user' | 'profile' | null = null;
      if ((appointment as any).doctorId && (appointment as any).doctorId._id) {
        doctorIdOut = (appointment as any).doctorId._id.toString();
        doctorName = (appointment as any).doctorId.name;
        doctorSource = 'user';
      } else if ((appointment as any).doctorProfileId && (appointment as any).doctorProfileId._id) {
        doctorIdOut = (appointment as any).doctorProfileId._id.toString();
        doctorName = (appointment as any).doctorProfileId.name;
        doctorSource = 'profile';
      }

      let patientIdOut = null;
      let patientName = '';
      let patientSource: 'user' | 'profile' | null = null;
      if ((appointment as any).patientId && (appointment as any).patientId._id) {
        patientIdOut = (appointment as any).patientId._id.toString();
        patientName = (appointment as any).patientId.name;
        patientSource = 'user';
      } else if ((appointment as any).patientProfileId && (appointment as any).patientProfileId._id) {
        patientIdOut = (appointment as any).patientProfileId._id.toString();
        patientName = (appointment as any).patientProfileId.name;
        patientSource = 'profile';
      }

      return NextResponse.json(
        {
          id: appointment._id.toString(),
          doctorId: doctorIdOut,
          doctorName,
          doctorSource,
          patientId: patientIdOut,
          patientName,
          patientSource,
          dateTime: appointment.dateTime.toISOString(),
          status: appointment.status,
          duration: appointment.duration,
          notes: appointment.notes,
        },
        { status: 200 }
      );
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch appointment' },
        { status: 500 }
      );
    }
  })(request);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    try {
      await connectDB();
      const { id } = await params;
      const auth = (request as any).user;
      const body = await request.json();
      const updates = updateAppointmentSchema.parse(body);

      const appointment = await Appointment.findOne({ _id: id, tenantId: auth?.tenantId });

      if (!appointment) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }

      // Authorization: staff can update any allowed fields.
      // Patients can only modify their own appointment and only allowed to cancel (status = 'cancelled') or update notes.
      if (auth?.role === 'patient') {
        const isOwner = ((appointment as any).patientId && (appointment as any).patientId.toString() === auth.userId) || ((appointment as any).patientProfileId && (appointment as any).patientProfileId.toString() === auth.userId);
        if (!isOwner) {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Only allow cancelling or updating notes
        if (updates.status !== undefined && updates.status !== 'cancelled') {
          return NextResponse.json({ error: 'Patients may only cancel appointments' }, { status: 403 });
        }

        if (updates.dateTime !== undefined || updates.duration !== undefined) {
          return NextResponse.json({ error: 'Patients cannot reschedule via this endpoint' }, { status: 403 });
        }
      }

      // Update allowed fields
      if (updates.status !== undefined) appointment.status = updates.status;
      if (updates.notes !== undefined) appointment.notes = updates.notes;
      if (updates.dateTime !== undefined) appointment.dateTime = new Date(updates.dateTime);
      if (updates.duration !== undefined) appointment.duration = updates.duration;

      await appointment.save();
      await appointment.populate('doctorId', 'name email');
      await appointment.populate('doctorProfileId', 'name email');
      await appointment.populate('patientId', 'name email');
      await appointment.populate('patientProfileId', 'name email');

      let doctorIdOut = null;
      let doctorName = '';
      let doctorSource: 'user' | 'profile' | null = null;
      if ((appointment as any).doctorId && (appointment as any).doctorId._id) {
        doctorIdOut = (appointment as any).doctorId._id.toString();
        doctorName = (appointment as any).doctorId.name;
        doctorSource = 'user';
      } else if ((appointment as any).doctorProfileId && (appointment as any).doctorProfileId._id) {
        doctorIdOut = (appointment as any).doctorProfileId._id.toString();
        doctorName = (appointment as any).doctorProfileId.name;
        doctorSource = 'profile';
      }

      let patientIdOut = null;
      let patientName = '';
      let patientSource: 'user' | 'profile' | null = null;
      if ((appointment as any).patientId && (appointment as any).patientId._id) {
        patientIdOut = (appointment as any).patientId._id.toString();
        patientName = (appointment as any).patientId.name;
        patientSource = 'user';
      } else if ((appointment as any).patientProfileId && (appointment as any).patientProfileId._id) {
        patientIdOut = (appointment as any).patientProfileId._id.toString();
        patientName = (appointment as any).patientProfileId.name;
        patientSource = 'profile';
      }

      return NextResponse.json(
        {
          id: appointment._id.toString(),
          doctorId: doctorIdOut,
          doctorName,
          doctorSource,
          patientId: patientIdOut,
          patientName,
          patientSource,
          dateTime: appointment.dateTime.toISOString(),
          status: appointment.status,
          duration: appointment.duration,
          notes: appointment.notes,
        },
        { status: 200 }
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: error.errors[0]?.message || 'Validation failed' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Failed to update appointment' },
        { status: 500 }
      );
    }
  })(request);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    try {
      await connectDB();
      const { id } = await params;
      const auth = (request as any).user;

      const appointment = await Appointment.findOne({ _id: id, tenantId: auth?.tenantId });

      if (!appointment) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }

      // Only allow deletion of scheduled appointments
      if (appointment.status !== 'scheduled') {
        return NextResponse.json(
          { error: 'Only scheduled appointments can be deleted' },
          { status: 400 }
        );
      }

      // If requester is a patient, ensure they own this appointment
      if (auth?.role === 'patient') {
        const isOwner = ((appointment as any).patientId && (appointment as any).patientId.toString() === auth.userId) || ((appointment as any).patientProfileId && (appointment as any).patientProfileId.toString() === auth.userId);
        if (!isOwner) {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }
      }

      await Appointment.deleteOne({ _id: id, tenantId: auth?.tenantId });

      return NextResponse.json({ message: 'Appointment deleted' }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to delete appointment' },
        { status: 500 }
      );
    }
  })(request);
}

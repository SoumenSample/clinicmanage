import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/lib/models/Appointment';
import User from '@/lib/models/User';
import { isAppointmentWithinAvailability } from '@/lib/services/clinic';
import { withAuth } from '@/middleware/auth';
import { z } from 'zod';

const createAppointmentSchema = z
  .object({
    doctorId: z.string().optional(),
    doctorProfileId: z.string().optional(),
    patientId: z.string().optional(),
    patientProfileId: z.string().optional(),
    dateTime: z.string().min(1, 'Date and time is required'),
    duration: z.number().min(15).max(480).default(30),
    notes: z.string().optional(),
  })
  .refine((data) => !!(data.doctorId || data.doctorProfileId), {
    message: 'Either doctorId or doctorProfileId is required',
  })
  .refine((data) => !!(data.patientId || data.patientProfileId), {
    message: 'Either patientId or patientProfileId is required',
  });

function parseAppointmentDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function resolveDoctorConflictCriteria(
  tenantId: string,
  doctorId?: string,
  doctorProfileId?: string
) {
  const criteria: { doctorIds: string[]; doctorProfileIds: string[] } = {
    doctorIds: [],
    doctorProfileIds: [],
  };

  if (doctorId) {
    criteria.doctorIds.push(doctorId);

    const doctor = await User.findOne({ _id: doctorId, tenantId, role: 'doctor' }).select('email');
    if (doctor?.email) {
      const matchedProfile = await User.db
        .model('Doctor')
        .findOne({ tenantId, email: doctor.email })
        .select('_id');
      if (matchedProfile?._id) {
        criteria.doctorProfileIds.push(matchedProfile._id.toString());
      }
    }
  }

  if (doctorProfileId) {
    criteria.doctorProfileIds.push(doctorProfileId);

    const doctorProfile = await User.db
      .model('Doctor')
      .findOne({ _id: doctorProfileId, tenantId })
      .select('email');

    if (doctorProfile?.email) {
      const matchedUser = await User.findOne({ tenantId, role: 'doctor', email: doctorProfile.email }).select('_id');
      if (matchedUser?._id) {
        criteria.doctorIds.push(matchedUser._id.toString());
      }
    }
  }

  return {
    doctorIds: Array.from(new Set(criteria.doctorIds)),
    doctorProfileIds: Array.from(new Set(criteria.doctorProfileIds)),
  };
}

export async function GET(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;

      // Get filter from query params
      const searchParams = request.nextUrl.searchParams;
      const doctorId = searchParams.get('doctorId');
      const doctorProfileId = searchParams.get('doctorProfileId');
      const patientId = searchParams.get('patientId');
      const patientProfileId = searchParams.get('patientProfileId');
      const status = searchParams.get('status');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      let filter: any = { tenantId: auth?.tenantId };

      // If requester is a patient, restrict to their own appointments
      if (auth?.role === 'patient') {
        filter.patientId = auth.userId;
      }

      if (doctorId) filter.doctorId = doctorId;
      if (doctorProfileId) filter.doctorProfileId = doctorProfileId;
      if (patientId) filter.patientId = patientId;
      if (patientProfileId) filter.patientProfileId = patientProfileId;
      if (status) filter.status = status;

      if (startDate || endDate) {
        filter.dateTime = {};
        if (startDate) filter.dateTime.$gte = new Date(startDate);
        if (endDate) filter.dateTime.$lte = new Date(endDate);
      }

      const appointments = await Appointment.find(filter)
        .populate('doctorId', 'name email')
        .populate('doctorProfileId', 'name email')
        .populate('patientId', 'name email')
        .populate('patientProfileId', 'name email')
        .sort({ dateTime: 1 });

      const sanitized = appointments.map((apt: any) => {
        let doctorIdOut = null;
        let doctorName = '';
        let doctorSource: 'user' | 'profile' | null = null;

        if (apt.doctorId && apt.doctorId._id) {
          doctorIdOut = apt.doctorId._id.toString();
          doctorName = apt.doctorId.name;
          doctorSource = 'user';
        } else if (apt.doctorProfileId && apt.doctorProfileId._id) {
          doctorIdOut = apt.doctorProfileId._id.toString();
          doctorName = apt.doctorProfileId.name;
          doctorSource = 'profile';
        }

        let patientIdOut = null;
        let patientName = '';
        let patientSource: 'user' | 'profile' | null = null;

        if (apt.patientId && apt.patientId._id) {
          patientIdOut = apt.patientId._id.toString();
          patientName = apt.patientId.name;
          patientSource = 'user';
        } else if (apt.patientProfileId && apt.patientProfileId._id) {
          patientIdOut = apt.patientProfileId._id.toString();
          patientName = apt.patientProfileId.name;
          patientSource = 'profile';
        }

        return {
          id: apt._id.toString(),
          doctorId: doctorIdOut,
          doctorName,
          doctorSource,
          patientId: patientIdOut,
          patientName,
          patientSource,
          dateTime: apt.dateTime.toISOString(),
          status: apt.status,
          duration: apt.duration,
          notes: apt.notes,
        };
      });

      return NextResponse.json(sanitized, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch appointments' },
        { status: 500 }
      );
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;

      // read body first, then inject patient id for patient users
      const body = await request.json();
      if (auth?.role === 'patient') {
        body.patientId = auth.userId;
      }

      const parsed = createAppointmentSchema.parse(body);

      const { doctorId: uDoctorId, doctorProfileId, patientId: uPatientId, patientProfileId } = parsed;

      // Resolve and validate doctor (user or profile)
      let usedDoctorField: 'doctorId' | 'doctorProfileId' | null = null;
      if (uDoctorId) {
        const doctor = await User.findOne({ _id: uDoctorId, tenantId: auth?.tenantId, role: 'doctor' });
        if (!doctor) return NextResponse.json({ error: 'Doctor user not found' }, { status: 404 });
        usedDoctorField = 'doctorId';
      } else if (doctorProfileId) {
        const doctorProfile = await User.db.model('Doctor').findOne({ _id: doctorProfileId, tenantId: auth?.tenantId });
        if (!doctorProfile) return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
        usedDoctorField = 'doctorProfileId';
      }

      // Resolve and validate patient (user or profile)
      let usedPatientField: 'patientId' | 'patientProfileId' | null = null;
      if (uPatientId) {
        const patient = await User.findOne({ _id: uPatientId, tenantId: auth?.tenantId });
        if (!patient) return NextResponse.json({ error: 'Patient user not found' }, { status: 404 });
        usedPatientField = 'patientId';
      } else if (patientProfileId) {
        const patientProfile = await User.db.model('Patient').findOne({ _id: patientProfileId, tenantId: auth?.tenantId });
        if (!patientProfile) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
        usedPatientField = 'patientProfileId';
      }

      const appointmentDate = parseAppointmentDate(parsed.dateTime);
      if (!appointmentDate) {
        return NextResponse.json({ error: 'Invalid datetime' }, { status: 400 });
      }
      // parsed appointmentDate computed
      const endTime = new Date(appointmentDate.getTime() + (parsed.duration || 30) * 60000);

      const doctorConflictCriteria = await resolveDoctorConflictCriteria(
        auth?.tenantId,
        uDoctorId,
        doctorProfileId
      );

      if (!doctorConflictCriteria.doctorIds.length && !doctorConflictCriteria.doctorProfileIds.length) {
        return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
      }

      const overlapQuery: any = {
        tenantId: auth?.tenantId,
        status: { $in: ['scheduled', 'completed'] },
        dateTime: { $lt: endTime },
        $expr: { $gt: [{ $add: ['$dateTime', { $multiply: ['$duration', 60000] }] }, appointmentDate] },
        $or: [
          doctorConflictCriteria.doctorIds.length ? { doctorId: { $in: doctorConflictCriteria.doctorIds } } : null,
          doctorConflictCriteria.doctorProfileIds.length
            ? { doctorProfileId: { $in: doctorConflictCriteria.doctorProfileIds } }
            : null,
        ].filter(Boolean),
      };

      // Ensure requested time falls within a declared availability slot
      const isWithin = await isAppointmentWithinAvailability(auth?.tenantId, doctorConflictCriteria.doctorIds, doctorConflictCriteria.doctorProfileIds, appointmentDate, parsed.duration || 30);
      if (!isWithin) {
        return NextResponse.json({ error: 'Requested time is outside doctor availability' }, { status: 409 });
      }

      const overlap = await Appointment.findOne(overlapQuery);

      if (overlap) {
        return NextResponse.json({ error: 'Doctor has conflicting appointment at this time' }, { status: 409 });
      }

      const appointmentData: any = {
        tenantId: auth?.tenantId,
        dateTime: appointmentDate,
        duration: parsed.duration || 30,
        notes: parsed.notes,
        status: 'scheduled',
      };

      if (usedDoctorField === 'doctorId') appointmentData.doctorId = uDoctorId;
      if (usedDoctorField === 'doctorProfileId') appointmentData.doctorProfileId = doctorProfileId;
      if (usedPatientField === 'patientId') appointmentData.patientId = uPatientId;
      if (usedPatientField === 'patientProfileId') appointmentData.patientProfileId = patientProfileId;

      const appointment = new Appointment(appointmentData);
      // appointment data prepared for save

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
        { status: 201 }
      );
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: error.errors[0]?.message || 'Validation failed' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Failed to create appointment' },
        { status: 500 }
      );
    }
  })(request);
}

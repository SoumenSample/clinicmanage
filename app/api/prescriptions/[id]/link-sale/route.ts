import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { linkPrescriptionToSale } from '@/lib/services/clinic';
import { prescriptionLinkSchema } from '@/lib/validations/clinic';

export async function POST(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      const auth = (req as any).user;
      const prescriptionId = req.nextUrl.pathname.split('/')[3];
      if (!prescriptionId) {
        return NextResponse.json({ error: 'Prescription ID is required' }, { status: 400 });
      }

      const body = await req.json();
      const { saleId } = prescriptionLinkSchema.parse(body);
      const prescription = await linkPrescriptionToSale(auth.tenantId, auth.userId, prescriptionId, saleId);

      if (!prescription) {
        return NextResponse.json({ error: 'Prescription or sale not found' }, { status: 404 });
      }

      return NextResponse.json(prescription, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Failed to link prescription to sale' }, { status: 500 });
    }
  })(request);
}
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { deleteSale, updateSale } from '@/lib/services/clinic';
import { z } from 'zod';

const saleItemSchema = z.object({
  medicineId: z.string(),
  quantity: z.number().min(1),
  price: z.number().min(0).optional(),
  mrp: z.number().min(0).optional(),
});

const updateSaleSchema = z.object({
  items: z.array(saleItemSchema),
  customerName: z.string().min(2),
  customerPhone: z.string().regex(/^[0-9+()\-\s]{7,15}$/),
  doctorName: z.string().trim().min(2),
  paymentMethod: z.enum(['cash', 'card', 'cheque', 'online']),
  discountPercent: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      const auth = (req as any).user;
      const saleId = req.nextUrl.pathname.split('/').pop();

      if (!saleId) {
        return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
      }

      const body = await req.json();
      const data = updateSaleSchema.parse(body);
      const sale = await updateSale(auth.tenantId, auth.userId, saleId, data);

      if (!sale) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      return NextResponse.json(sale, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to update invoice' },
        { status: 500 }
      );
    }
  })(request);
}

export async function DELETE(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      const auth = (req as any).user;
      const saleId = req.nextUrl.pathname.split('/').pop();

      if (!saleId) {
        return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
      }

      const sale = await deleteSale(auth.tenantId, auth.userId, saleId);

      if (!sale) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Invoice deleted successfully' }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to delete invoice' },
        { status: 500 }
      );
    }
  })(request);
}
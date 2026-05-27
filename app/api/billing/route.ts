import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { createSale } from '@/lib/services/clinic';
import Sale from '@/lib/models/Sale';
import { withAuth } from '@/middleware/auth';
import { z } from 'zod';

const saleItemSchema = z.object({
  medicineId: z.string(),
  quantity: z.number().min(1),
  price: z.number().min(0).optional(),
  mrp: z.number().min(0).optional(),
});

const createSaleSchema = z.object({
  items: z.array(saleItemSchema),
  customerName: z.string().min(2),
  customerPhone: z.string().regex(/^[0-9+()\-\s]{7,15}$/),
  doctorName: z.string().trim().min(2),
  paymentMethod: z.enum(['cash', 'card', 'cheque', 'online']),
  discountPercent: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

function generateInvoiceNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `INV-${timestamp}-${randomPart}`;
}

export async function GET(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;

      const startDate = req.nextUrl.searchParams.get('startDate');
      const endDate = req.nextUrl.searchParams.get('endDate');

      let query: any = {};
      if (auth?.tenantId) {
        query.tenantId = auth.tenantId;
      }
      if (startDate && endDate) {
        query.saleDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const sales = await Sale.find(query)
        .populate('staffId', 'name email')
        .sort({ saleDate: -1 });

      const normalizedSales = sales.map((sale: any) => {
        const saleObj = sale.toObject();
        const invoiceFallback = saleObj?._id
          ? `INV-${String(saleObj._id).slice(-6).toUpperCase()}`
          : 'N/A';

        return {
          ...saleObj,
          invoiceNumber: saleObj.invoiceNumber || saleObj.invoiceNo || invoiceFallback,
          customerName:
            saleObj.customerName || saleObj.customer?.name || saleObj.clientName || 'N/A',
          customerPhone:
            saleObj.customerPhone || saleObj.customer?.phone || saleObj.clientPhone || 'N/A',
          doctorName: saleObj.doctorName || saleObj.doctor?.name || 'N/A',
          staffName: saleObj.staffId?.name || saleObj.staffName || saleObj.staff?.name || 'N/A',
        };
      });

      return NextResponse.json(normalizedSales, { status: 200 });
    } catch (error: any) {
      console.error('Billing API GET Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch sales', details: process.env.NODE_ENV === 'development' ? error.toString() : undefined },
        { status: 500 }
      );
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      const user = (req as any).user;
      const body = await req.json();
      const { items, customerName, customerPhone, doctorName, paymentMethod, discountPercent, notes } = createSaleSchema.parse(body);
      const sale = await createSale(user.tenantId, user.userId, {
        items,
        customerName,
        customerPhone,
        doctorName,
        paymentMethod,
        discountPercent,
        notes,
      });

      return NextResponse.json(sale, { status: 201 });
    } catch (error: any) {
      console.error('Billing API POST Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create sale', details: process.env.NODE_ENV === 'development' ? error.toString() : undefined },
        { status: 500 }
      );
    }
  })(request);
}

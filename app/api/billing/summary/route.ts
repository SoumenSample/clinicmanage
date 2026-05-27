import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Sale from '@/lib/models/Sale';
import { withSuperAdminAuth } from '@/middleware/auth';

export const GET = withSuperAdminAuth(async () => {
  try {
    await connectDB();

    const [totals] = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 },
        },
      },
    ]);

    const stores = await Sale.aggregate([
      {
        $group: {
          _id: '$tenantId',
          totalRevenue: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'tenants',
          localField: '_id',
          foreignField: '_id',
          as: 'tenant',
        },
      },
      { $unwind: { path: '$tenant', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          tenantId: { $toString: '$_id' },
          tenantName: { $ifNull: ['$tenant.name', 'Unknown'] },
          tenantSlug: { $ifNull: ['$tenant.slug', 'unknown'] },
          totalRevenue: 1,
          invoiceCount: 1,
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    return NextResponse.json(
      {
        totals: {
          totalRevenue: totals?.totalRevenue || 0,
          invoiceCount: totals?.invoiceCount || 0,
        },
        stores,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load billing summary' },
      { status: 500 }
    );
  }
});

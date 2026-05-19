import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import connectDB from '@/lib/db';
import Category from '@/lib/models/Category';
import Medicine from '@/lib/models/Medicine';
import { withAdminAuth, withAuth } from '@/middleware/auth';

const categorySchema = z.object({
  name: z.string().min(1),
  gstPercentage: z.number().min(0).max(100),
});

async function buildCategoryItems(tenantId: string) {
  const [categories, medicines] = await Promise.all([
    Category.find({ tenantId }).sort({ createdAt: -1 }).lean(),
    Medicine.find({ tenantId }, 'category').lean(),
  ]);

  const medicineCounts = medicines.reduce<Record<string, number>>((acc, medicine) => {
    const key = (medicine.category || '').trim().toLowerCase();
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return categories.map((category: any) => ({
    _id: String(category._id),
    name: category.name,
    gstPercentage: category.gstPercentage,
    medicineCount: medicineCounts[category.name.trim().toLowerCase()] || 0,
  }));
}

export async function GET(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;

      const items = await buildCategoryItems(auth.tenantId);
      return NextResponse.json(items, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch categories' },
        { status: 500 }
      );
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;
      const body = await req.json();
      const data = categorySchema.parse(body);

      const category = await Category.create({
        tenantId: auth.tenantId,
        name: data.name.trim(),
        gstPercentage: data.gstPercentage,
      });

      return NextResponse.json({ ok: true, category }, { status: 201 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to create category' },
        { status: 500 }
      );
    }
  })(request);
}

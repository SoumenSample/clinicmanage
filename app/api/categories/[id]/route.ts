import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import connectDB from '@/lib/db';
import Category from '@/lib/models/Category';
import Medicine from '@/lib/models/Medicine';
import { withAdminAuth } from '@/middleware/auth';

const categorySchema = z.object({
  name: z.string().min(1),
  gstPercentage: z.number().min(0).max(100),
});

export async function PUT(request: NextRequest) {
  return withAdminAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;
      const id = req.nextUrl.pathname.split('/').pop();

      if (!id) {
        return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
      }

      const body = await req.json();
      const data = categorySchema.parse(body);

      const existing = await Category.findOne({ _id: id, tenantId: auth.tenantId });
      if (!existing) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }

      const category = await Category.findOneAndUpdate(
        { _id: id, tenantId: auth.tenantId },
        {
          $set: {
            name: data.name.trim(),
            gstPercentage: data.gstPercentage,
          },
        },
        { new: true }
      );

      if (category) {
        await Medicine.updateMany(
          { tenantId: auth.tenantId, category: existing.name },
          { $set: { category: category.name } }
        );
      }

      return NextResponse.json({ ok: true, category }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to update category' },
        { status: 500 }
      );
    }
  })(request);
}

export async function DELETE(request: NextRequest) {
  return withAdminAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;
      const id = req.nextUrl.pathname.split('/').pop();

      if (!id) {
        return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
      }

      const category = await Category.findOne({ _id: id, tenantId: auth.tenantId });

      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }

      const linkedMedicines = await Medicine.countDocuments({ tenantId: auth.tenantId, category: category.name });
      if (linkedMedicines > 0) {
        return NextResponse.json(
          { error: 'Reassign medicines before deleting this category' },
          { status: 400 }
        );
      }

      await Category.findOneAndDelete({ _id: id, tenantId: auth.tenantId });

      return NextResponse.json({ message: 'Category deleted successfully' }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to delete category' },
        { status: 500 }
      );
    }
  })(request);
}

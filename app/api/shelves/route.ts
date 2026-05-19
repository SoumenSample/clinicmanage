import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import connectDB from '@/lib/db';
import Medicine from '@/lib/models/Medicine';
import Shelf from '@/lib/models/Shelf';
import { withAdminAuth, withAuth } from '@/middleware/auth';

const shelfSchema = z.object({
  code: z.string().optional().or(z.literal('')),
  label: z.string().min(1),
  locationType: z.enum(['AISLE', 'RACK', 'SHELF', 'BIN']),
  parentShelfId: z.string().optional().or(z.literal('')),
  capacityQty: z.number().min(0).optional(),
  minOccupancyPct: z.number().min(0).max(100).optional(),
  notes: z.string().optional().or(z.literal('')),
});

function generateShelfCode() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 9000 + 1000).toString();
  return `SH-${datePart}-${randomPart}`;
}

async function buildShelfItems(tenantId: string, search?: string | null) {
  const [shelves, medicines] = await Promise.all([
    Shelf.find({ tenantId }).sort({ createdAt: -1 }),
    Medicine.find({ tenantId }, 'shelfId quantity name batchNumber'),
  ]);

  const statsByShelf = medicines.reduce<Record<string, { medicineCount: number; totalQuantity: number; medicineNames: string[] }>>(
    (acc, medicine) => {
      if (!medicine.shelfId) return acc;

      const shelfId = medicine.shelfId.toString();
      const current = acc[shelfId] || { medicineCount: 0, totalQuantity: 0, medicineNames: [] };

      current.medicineCount += 1;
      current.totalQuantity += medicine.quantity || 0;
      current.medicineNames.push(medicine.name);
      acc[shelfId] = current;

      return acc;
    },
    {}
  );

  const items = shelves.map((shelf) => {
    const stats = statsByShelf[shelf._id.toString()] || { medicineCount: 0, totalQuantity: 0, medicineNames: [] };
    const capacityQty = shelf.capacityQty || 0;
    const occupancyPct = capacityQty > 0 ? Math.round((stats.totalQuantity / capacityQty) * 1000) / 10 : null;

    return {
      _id: shelf._id.toString(),
      code: shelf.code,
      label: shelf.label,
      locationType: shelf.locationType,
      parentShelfId: shelf.parentShelfId ? shelf.parentShelfId.toString() : null,
      capacityQty: shelf.capacityQty,
      minOccupancyPct: shelf.minOccupancyPct,
      notes: shelf.notes || '',
      medicineCount: stats.medicineCount,
      totalQuantity: stats.totalQuantity,
      occupancyPct,
      isHighOccupancy: occupancyPct !== null ? occupancyPct >= shelf.minOccupancyPct : false,
      isOverCapacity: capacityQty > 0 ? stats.totalQuantity > capacityQty : false,
      medicineNames: stats.medicineNames,
    };
  });

  const normalizedSearch = search?.trim().toLowerCase();
  if (!normalizedSearch) {
    return items;
  }

  return items.filter((item) => {
    const shelfMatch =
      item.code.toLowerCase().includes(normalizedSearch) ||
      item.label.toLowerCase().includes(normalizedSearch) ||
      item.locationType.toLowerCase().includes(normalizedSearch);

    if (shelfMatch) {
      return true;
    }

    return item.medicineNames.some((name) => name.toLowerCase().includes(normalizedSearch));
  });
}

export async function GET(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;
      const search = req.nextUrl.searchParams.get('search');

      const items = await buildShelfItems(auth.tenantId, search);

      return NextResponse.json({ items }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch shelves' },
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
      const data = shelfSchema.parse(body);

      if (data.parentShelfId) {
        const parentShelf = await Shelf.findOne({ _id: data.parentShelfId, tenantId: auth.tenantId });
        if (!parentShelf) {
          return NextResponse.json({ error: 'Parent shelf not found' }, { status: 404 });
        }
      }

      const shelf = await Shelf.create({
        tenantId: auth.tenantId,
        code: data.code?.trim() || generateShelfCode(),
        label: data.label.trim(),
        locationType: data.locationType,
        parentShelfId: data.parentShelfId || null,
        capacityQty: data.capacityQty ?? 0,
        minOccupancyPct: data.minOccupancyPct ?? 85,
        notes: data.notes?.trim() || '',
      });

      return NextResponse.json({ ok: true, shelf }, { status: 201 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to create shelf' },
        { status: 500 }
      );
    }
  })(request);
}
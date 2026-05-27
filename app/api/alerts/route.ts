import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Alert from '@/lib/models/Alert';
import StockAlert from '@/lib/models/StockAlert';
import { mapStockAlertToPayload, mapSystemAlertToPayload } from '@/lib/services/alerts';
import { withAuth } from '@/middleware/auth';

export async function GET(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      await connectDB();
      const auth = (req as any).user;

      const unresolved = req.nextUrl.searchParams.get('unresolved') === 'true';

      let query: any = {};
      if (auth?.tenantId) {
        query.tenantId = auth.tenantId;
      }
      if (unresolved) {
        query.isResolved = false;
      }

      const [stockAlerts, systemAlerts] = await Promise.all([
        StockAlert.find(query).sort({ createdAt: -1 }),
        Alert.find(query).sort({ createdAt: -1 }),
      ]);

      const normalized = [
        ...stockAlerts.map((alert) => mapStockAlertToPayload(alert)),
        ...systemAlerts.map((alert) => mapSystemAlertToPayload(alert)),
      ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

      return NextResponse.json(normalized, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch alerts' },
        { status: 500 }
      );
    }
  })(request);
}

export async function PUT(request: NextRequest) {
  return withAuth(async (req: NextRequest) => {
    try {
      await connectDB();

      const id = req.nextUrl.searchParams.get('id');
      const kind = req.nextUrl.searchParams.get('kind');
      if (!id) {
        return NextResponse.json(
          { error: 'Alert ID is required' },
          { status: 400 }
        );
      }

      const update = {
        isResolved: true,
        resolvedAt: new Date(),
      };

      if (kind === 'system') {
        const alert = await Alert.findByIdAndUpdate(id, update, { new: true });
        if (!alert) {
          return NextResponse.json(
            { error: 'Alert not found' },
            { status: 404 }
          );
        }
        return NextResponse.json(mapSystemAlertToPayload(alert), { status: 200 });
      }

      if (kind === 'stock') {
        const alert = await StockAlert.findByIdAndUpdate(id, update, { new: true });
        if (!alert) {
          return NextResponse.json(
            { error: 'Alert not found' },
            { status: 404 }
          );
        }
        return NextResponse.json(mapStockAlertToPayload(alert), { status: 200 });
      }

      const stockAlert = await StockAlert.findByIdAndUpdate(id, update, { new: true });
      if (stockAlert) {
        return NextResponse.json(mapStockAlertToPayload(stockAlert), { status: 200 });
      }

      const systemAlert = await Alert.findByIdAndUpdate(id, update, { new: true });
      if (systemAlert) {
        return NextResponse.json(mapSystemAlertToPayload(systemAlert), { status: 200 });
      }

      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to update alert' },
        { status: 500 }
      );
    }
  })(request);
}

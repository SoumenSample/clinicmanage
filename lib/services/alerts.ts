import Alert, { AlertCategory, AlertSeverity } from '@/lib/models/Alert';
import type { IStockAlert } from '@/lib/models/StockAlert';
import { publishAlertEvent, type AlertEventPayload } from '@/lib/services/alertStream';

export type CreateAlertInput = {
  tenantId: string;
  title: string;
  message: string;
  category: AlertCategory;
  severity?: AlertSeverity;
  entityType?: string;
  entityId?: string;
};

export async function createSystemAlert(input: CreateAlertInput) {
  const alert = await Alert.create({
    tenantId: input.tenantId,
    title: input.title,
    message: input.message,
    category: input.category,
    severity: input.severity || 'info',
    entityType: input.entityType || null,
    entityId: input.entityId || null,
  });

  publishAlertEvent(input.tenantId, mapSystemAlertToPayload(alert));
  return alert;
}

export function mapSystemAlertToPayload(alert: any): AlertEventPayload {
  return {
    id: alert._id.toString(),
    kind: 'system',
    title: alert.title,
    message: alert.message,
    category: alert.category,
    severity: alert.severity,
    createdAt: alert.createdAt ? new Date(alert.createdAt).toISOString() : new Date().toISOString(),
    isResolved: Boolean(alert.isResolved),
    entityType: alert.entityType || undefined,
    entityId: alert.entityId || undefined,
  };
}

export function mapStockAlertToPayload(alert: IStockAlert): AlertEventPayload {
  const severity = alert.alertType === 'expired' ? 'critical' : 'warning';

  return {
    id: (alert as any)._id.toString(),
    kind: 'stock',
    title: alert.medicineName,
    message: alert.message,
    category: 'inventory',
    severity,
    createdAt: alert.createdAt ? new Date(alert.createdAt).toISOString() : new Date().toISOString(),
    isResolved: Boolean(alert.isResolved),
    entityType: 'Medicine',
    entityId: alert.medicineId.toString(),
  };
}

export type AlertEventPayload = {
  id: string;
  kind: 'stock' | 'system';
  title: string;
  message: string;
  category: 'appointments' | 'billing' | 'doctors' | 'prescriptions' | 'patients' | 'inventory' | 'system';
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
  isResolved: boolean;
  entityType?: string;
  entityId?: string;
};

type AlertListener = (payload: AlertEventPayload) => void;

const listenersByTenant = new Map<string, Set<AlertListener>>();

export function publishAlertEvent(tenantId: string, payload: AlertEventPayload) {
  const listeners = listenersByTenant.get(tenantId);
  if (!listeners || listeners.size === 0) return;

  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // Ignore listener errors to avoid breaking other subscribers.
    }
  });
}

export function subscribeToAlertEvents(tenantId: string, listener: AlertListener) {
  const existing = listenersByTenant.get(tenantId) || new Set<AlertListener>();
  existing.add(listener);
  listenersByTenant.set(tenantId, existing);

  return () => {
    const current = listenersByTenant.get(tenantId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      listenersByTenant.delete(tenantId);
    }
  };
}

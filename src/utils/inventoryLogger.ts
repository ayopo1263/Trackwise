export interface InventoryLog {
  id: string;
  createdAt: string;
  productName: string;
  quantityBefore: number;
  quantityAfter: number;
  difference: number; // e.g. +10 or -3
  actionType: 'Addition' | 'Adjustment' | 'Sale Deduction' | 'Deletion';
  staffName: string;
}

const getActiveUserEmail = (): string => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('auth-token')) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && parsed.user && parsed.user.email) {
            return parsed.user.email.toLowerCase().trim();
          }
        }
      }
    }
  } catch (e) {
    console.error('Error auto-detecting user session for logs:', e);
  }
  return '';
};

export const addInventoryLog = (
  productName: string,
  quantityBefore: number,
  quantityAfter: number,
  actionType: 'Addition' | 'Adjustment' | 'Sale Deduction' | 'Deletion',
  staffName: string,
  userEmail?: string
) => {
  try {
    const email = (userEmail || getActiveUserEmail()).toLowerCase().trim();
    const key = email ? `trackwise_inventory_logs_${email}` : 'trackwise_inventory_logs';
    
    const existingLogsRaw = localStorage.getItem(key);
    const logs: InventoryLog[] = existingLogsRaw ? JSON.parse(existingLogsRaw) : [];
    
    const newLog: InventoryLog = {
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      productName,
      quantityBefore,
      quantityAfter,
      difference: quantityAfter - quantityBefore,
      actionType,
      staffName: staffName.trim() || 'System Manager'
    };
    
    logs.unshift(newLog); // Put latest first
    localStorage.setItem(key, JSON.stringify(logs));
  } catch (err) {
    console.error('Error adding inventory log:', err);
  }
};

export const getInventoryLogs = (userEmail?: string): InventoryLog[] => {
  try {
    const email = (userEmail || getActiveUserEmail()).toLowerCase().trim();
    const key = email ? `trackwise_inventory_logs_${email}` : 'trackwise_inventory_logs';
    
    const existingLogsRaw = localStorage.getItem(key);
    return existingLogsRaw ? JSON.parse(existingLogsRaw) : [];
  } catch (err) {
    console.error('Error fetching inventory logs:', err);
    return [];
  }
};

export const clearInventoryLogs = (userEmail?: string) => {
  try {
    const email = (userEmail || getActiveUserEmail()).toLowerCase().trim();
    const key = email ? `trackwise_inventory_logs_${email}` : 'trackwise_inventory_logs';
    
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Error clearing inventory logs:', err);
  }
};

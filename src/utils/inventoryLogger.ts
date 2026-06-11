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
  
  export const addInventoryLog = (
    productName: string,
    quantityBefore: number,
    quantityAfter: number,
    actionType: 'Addition' | 'Adjustment' | 'Sale Deduction' | 'Deletion',
    staffName: string
  ) => {
    try {
      const existingLogsRaw = localStorage.getItem('trackwise_inventory_logs');
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
      localStorage.setItem('trackwise_inventory_logs', JSON.stringify(logs));
    } catch (err) {
      console.error('Error adding inventory log:', err);
    }
  };
  
  export const getInventoryLogs = (): InventoryLog[] => {
    try {
      const existingLogsRaw = localStorage.getItem('trackwise_inventory_logs');
      return existingLogsRaw ? JSON.parse(existingLogsRaw) : [];
    } catch (err) {
      console.error('Error fetching inventory logs:', err);
      return [];
    }
  };
  
  export const clearInventoryLogs = () => {
    try {
      localStorage.removeItem('trackwise_inventory_logs');
    } catch (err) {
      console.error('Error clearing inventory logs:', err);
    }
  };
  
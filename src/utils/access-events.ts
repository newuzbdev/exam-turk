export function notifyAccessAllowanceChanged() { if (typeof window !== "undefined") window.dispatchEvent(new Event("access:allowance-changed")); }

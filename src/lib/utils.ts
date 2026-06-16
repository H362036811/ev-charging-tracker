export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateInput(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayStr(): string {
  return formatDateInput(new Date().toISOString());
}

export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxx-xxxx-xxxx-xxxx'.replace(/x/g, () => 
      Math.floor(Math.random() * 16).toString(16)
    );
}

// Simple hash for password storage (not cryptographically secure, but works for local-first)
// In production with Supabase, Supabase Auth handles this properly
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'ev-charging-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function verifyPasswordSync(password: string, hash: string): boolean {
  // This is async in reality, but for sync checks we use a simpler approach
  return false;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

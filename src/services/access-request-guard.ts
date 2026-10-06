import { accessService } from '@/services/access.service';

// A stored feature context must never degrade into a legacy paid request when
// the installation gate is off. Historical result/status reads remain available.
export async function assertContentAccessEnabled(input: { accessContextId?: string }): Promise<void> {
  if (input.accessContextId && !(await accessService.getConfig()).enabled) {
    throw new Error('Bu erişim şu anda kullanılamıyor. Lütfen bağlantıyı yeniden açın.');
  }
}

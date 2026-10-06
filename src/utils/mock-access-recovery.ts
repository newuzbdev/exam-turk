import { accessErrorMessage } from '@/utils/content-access';
import type { AccessTarget } from '@/services/access.service';
export function reportMockAccessFailure(error: unknown, target: AccessTarget) {
  if (accessErrorMessage(error) && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('access:mock-blocked', { detail: { error, target } }));
}

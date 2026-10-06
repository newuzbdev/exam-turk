import { accessService, type AccessTarget } from '@/services/access.service';
import { readAccessOwner } from '@/hooks/use-access-link';
import { saveOwnedAccess } from '@/utils/access-link-context';

// Always a normal, new admission: saved SHARE pointers never authorize a catalog card.
export async function bindNormalAccess(ownerId: string, target: AccessTarget) {
  const session = await accessService.createSession(target);
  if (readAccessOwner() !== ownerId) throw new Error('Hesabınız değişti. Yeniden giriş yapın.');
  saveOwnedAccess(ownerId, target, { target, contextId: session.contextId });
  return session.contextId;
}

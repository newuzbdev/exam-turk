import type { AccessTarget } from '../services/access.service';

// An ordinary single-Mock link carries identity only; live access still decides permission.
export function readDirectMockTarget(params: URLSearchParams): AccessTarget | null {
  if (!params.has('test')) return null;
  const skill = params.get('skills');
  if (params.getAll('test').length !== 1 || !params.get('test')?.trim() ||
      params.getAll('package').length !== 1 || !params.get('package')?.trim() ||
      params.getAll('skills').length !== 1) throw new Error('ACCESS_DIRECT_TARGET_INVALID');
  const scope = { reading: 'MOCK_READING', listening: 'MOCK_LISTENING', writing: 'MOCK_WRITING', speaking: 'MOCK_SPEAKING' } as const;
  if (!skill || !Object.prototype.hasOwnProperty.call(scope, skill)) throw new Error('ACCESS_DIRECT_TARGET_INVALID');
  return { scope: scope[skill as keyof typeof scope], targetId: params.get('test')! };
}

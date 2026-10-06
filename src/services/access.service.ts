import axiosPrivate from '@/config/api';

export type AccessScope = 'PLATFORM' | 'MOCK_PACKAGE' | `MOCK_${'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING'}` | `PRACTICE_${'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING'}`;
export type AccessTarget = { scope: AccessScope; targetId?: string };
export type AccessMode = 'AUTO' | 'PAID';
export type AccessMockSection = 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING';
export type AccessDecision = {
  canOpen: boolean;
  isPublicFree: boolean;
  sourceKind: 'PAID' | 'ADMIN' | 'PUBLIC' | 'SHARE' | 'LEGACY_FREE' | null;
  endsAt: string | null;
  remaining: Partial<Record<'MOCK_WRITING' | 'MOCK_SPEAKING' | 'PRACTICE_AI', number>>;
  blockedReason: 'MEMBERSHIP_REQUIRED' | 'EXPIRED' | 'AI_LIMIT' | null;
};
export type AccessSessionInput = { mode?: AccessMode; shareRedemptionId?: string; selectedTargets?: AccessTarget[] };
export type AccessSession = { contextId: string; decision: AccessDecision };
export type ShareRedemption = { redemptionId: string; target: AccessTarget; endsAt: string };
export type AccessDecisionItem = AccessDecision & { target: AccessTarget; shareTarget?: AccessTarget; availableSkills?: string[]; publicFreeSkills?: string[] };

export type CatalogGroup = { scope: AccessScope; category?: string | null; practiceType?: string | null; total: number; publicFreeCount: number };
export type CatalogMetadata = { isPublicFree?: boolean; endsAt?: string | null; availableSkills?: AccessMockSection[]; publicFreeSkills?: AccessMockSection[] };

const unwrap = <T>(payload: T | { data: T }): T => payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload as T;
let configRequest: Promise<{ enabled: boolean }> | undefined;
export const accessService = {
  getConfig() {
    // In-memory only. Failed configuration is retryable and never enables rollout.
    return configRequest ??= axiosPrivate.get<{ data: { enabled: boolean } }>('/api/access/config')
      .then(response => {
        const config = unwrap(response.data);
        if (typeof config.enabled !== 'boolean') throw new Error('Erişim ayarı doğrulanamadı.');
        return config;
      })
      .catch(error => { configRequest = undefined; throw error; });
  },
  async getDecisions(targets: AccessTarget[], mode?: AccessMode, shareRedemptionId?: string): Promise<AccessDecisionItem[]> {
    const response = await axiosPrivate.post('/api/access/decisions', { targets, ...(mode ? { mode } : {}), ...(shareRedemptionId ? { shareRedemptionId } : {}) });
    return unwrap<AccessDecisionItem[]>(response.data);
  },
  async getCatalogSummary(): Promise<{ asOf: string; groups: CatalogGroup[] }> {
    const response = await axiosPrivate.get('/api/access/catalog-summary');
    return unwrap(response.data);
  },
  async getOwnAccess(): Promise<Array<{ id: string; scope: AccessScope; startsAt: string; endsAt: string; remaining: AccessDecision['remaining'] }>> {
    const response = await axiosPrivate.get('/api/access/me');
    return unwrap(response.data);
  },
  async redeemShare(token: string): Promise<ShareRedemption> {
    const response = await axiosPrivate.post('/api/access/share/redeem', { token });
    return unwrap(response.data);
  },
  async createSession(target: AccessTarget, input: AccessSessionInput = {}): Promise<AccessSession> {
    const response = await axiosPrivate.post('/api/access/sessions', { target, ...input });
    return unwrap(response.data);
  },
  async continueMockPaid(overallTestId: string, input: { section: AccessMockSection; accessContextId: string }): Promise<AccessSession & { overallTestId: string; section: AccessMockSection }> {
    const response = await axiosPrivate.post(`/api/access/sessions/mock/${encodeURIComponent(overallTestId)}/paid`, input);
    return unwrap(response.data);
  },
};

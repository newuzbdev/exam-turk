import { authService } from '@/services/auth.service';
import { API_BASE_URL } from '@/config/runtime';

// Manual token cleanup utility
export const cleanupExpiredTokens = () => {
  console.log('Starting manual token cleanup...');
  authService.cleanupExpiredTokens();
  console.log('Token cleanup completed');
};

// Clear all tokens (for debugging)
export const clearAllTokens = () => {
  console.log('Clearing all tokens...');
  authService.clearStoredTokens();
  console.log('All tokens cleared');
};

// Check token status
export const checkTokenStatus = () => {
  const { accessToken, refreshToken } = authService.getStoredTokens();
  
  console.log('=== Token Status ===');
  console.log('Access Token:', accessToken ? 'Present' : 'Missing');
  console.log('Refresh Token:', refreshToken ? 'Present' : 'Missing');
  
  if (accessToken) {
    const isExpired = authService.isTokenExpired(accessToken);
    console.log('Access Token Expired:', isExpired);
  }
  
  if (refreshToken) {
    const isExpired = authService.isTokenExpired(refreshToken);
    console.log('Refresh Token Expired:', isExpired);
  }
  
  // Check test tokens
  const keys = Object.keys(sessionStorage);
  const testTokens = keys.filter(key => key.includes('overall.sessionToken'));
  console.log('Test Tokens Found:', testTokens.length);
  
  testTokens.forEach(key => {
    const token = sessionStorage.getItem(key);
    if (token) {
      const isExpired = authService.isTokenExpired(token);
      console.log(`${key}: ${isExpired ? 'Expired' : 'Valid'}`);
    }
  });
  
  console.log('==================');
};

// Test token refresh
export const testTokenRefresh = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('Refresh response:', data);
    
    if (data.accessToken) {
      authService.storeTokens(data.accessToken, data.refreshToken);
      console.log('✅ Token refreshed successfully');
    } else {
      console.log('❌ No new token received');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    return null;
  }
};

// Test API endpoint with current token
export const testApiEndpoint = async (endpoint: string = '/api/auth/me') => {
  try {
    const { accessToken } = authService.getStoredTokens();
    
    console.log('🧪 Testing API endpoint:', endpoint);
    console.log('🔑 Using token:', accessToken ? accessToken.substring(0, 20) + '...' : 'No token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('📡 API Response:', {
      status: response.status,
      statusText: response.statusText,
      data: data
    });
    
    return { status: response.status, data };
  } catch (error) {
    console.error('❌ API test failed:', error);
    return null;
  }
};

declare global {
  interface Window {
    cleanupExpiredTokens: typeof cleanupExpiredTokens;
    clearAllTokens: typeof clearAllTokens;
    checkTokenStatus: typeof checkTokenStatus;
    testTokenRefresh: typeof testTokenRefresh;
    testApiEndpoint: typeof testApiEndpoint;
  }
}

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  window.cleanupExpiredTokens = cleanupExpiredTokens;
  window.clearAllTokens = clearAllTokens;
  window.checkTokenStatus = checkTokenStatus;
  window.testTokenRefresh = testTokenRefresh;
  window.testApiEndpoint = testApiEndpoint;
}

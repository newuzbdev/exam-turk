# HttpOnly Cookie Authentication Guide

## 🎯 **Goal: Zero Client-Side Token Storage**

This approach eliminates **ALL** client-side token storage (localStorage, sessionStorage, memory) by using HttpOnly cookies managed entirely by the backend.

## 🔒 **How HttpOnly Cookies Work**

### What are HttpOnly Cookies?
- **Server-managed**: Set and cleared only by the backend
- **Automatic inclusion**: Browser automatically sends them with requests
- **JavaScript inaccessible**: Cannot be read/modified by client-side code
- **XSS protection**: Immune to Cross-Site Scripting attacks

### Security Benefits:
- ✅ **No client-side token exposure**
- ✅ **XSS attack immunity**
- ✅ **Automatic CSRF protection** (with SameSite)
- ✅ **No token management complexity**

## 🛠️ **Implementation Requirements**

### Backend Changes Needed:

#### 1. OAuth Callback Endpoint:
```javascript
// Instead of returning tokens in response/URL
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    // Process Google OAuth
    const { user, accessToken, refreshToken } = await processGoogleOAuth(req);
    
    // Set HttpOnly cookies (NOT accessible via JavaScript)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,        // Cannot be accessed via JavaScript
      secure: true,          // Only sent over HTTPS in production
      sameSite: 'strict',    // CSRF protection
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Redirect to frontend WITHOUT tokens in URL
    res.redirect(`${process.env.FRONTEND_URL}/`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/?error=oauth_failed`);
  }
});
```

#### 2. Authentication Middleware:
```javascript
// Middleware to read tokens from HttpOnly cookies
const authenticateFromCookies = (req, res, next) => {
  const accessToken = req.cookies.accessToken;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'No authentication token' });
  }
  
  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

#### 3. Logout Endpoint:
```javascript
app.post('/api/auth/logout', (req, res) => {
  // Clear HttpOnly cookies
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
});
```

#### 4. Token Refresh Endpoint:
```javascript
app.post('/api/user/refresh', (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const newAccessToken = generateAccessToken(decoded.userId);
    
    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

### Frontend Changes (Already Implemented):

#### 1. New Services:
- ✅ `src/services/cookieAuth.service.ts` - No token storage
- ✅ `src/config/cookieApi.ts` - HttpOnly cookie support
- ✅ `src/contexts/CookieAuthContext.tsx` - Cookie-based auth context

#### 2. Updated Components:
- ✅ `src/pages/home/CookieHome.tsx` - No token handling

## 🔄 **Migration Steps**

### Step 1: Update Backend (Required)
```bash
# Add cookie parsing middleware
npm install cookie-parser

# Update OAuth endpoints to set HttpOnly cookies
# Update authentication middleware to read from cookies
# Add logout endpoint to clear cookies
```

### Step 2: Update Frontend Imports
```javascript
// Replace current imports:
// import { useAuth } from "@/contexts/AuthContext";
// import { authService } from "@/services/auth.service";
// import axiosPrivate from "@/config/api";

// With new cookie-based imports:
import { useAuth } from "@/contexts/CookieAuthContext";
import { cookieAuthService } from "@/services/cookieAuth.service";
import axiosCookie from "@/config/cookieApi";
```

### Step 3: Update Main App
```javascript
// In src/main.tsx, replace:
// <AuthProvider>

// With:
// <CookieAuthProvider>
```

## 📊 **Comparison: Current vs HttpOnly Cookies**

### Current Approach (SessionStorage):
```javascript
// ❌ Tokens visible in browser storage
sessionStorage: {
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "66728c68-ce1c-4d1b-bb7c-d7b4f458be04"
}

// ❌ Manual token management required
const token = sessionStorage.getItem('accessToken');
config.headers.Authorization = `Bearer ${token}`;
```

### HttpOnly Cookie Approach:
```javascript
// ✅ No tokens visible in browser storage
sessionStorage: {
  // Empty - no sensitive data
}

// ✅ Automatic token management
// Browser automatically includes cookies in requests
// No manual token handling required
```

## 🧪 **Testing the Implementation**

### 1. Check Browser Storage:
- Open DevTools → Application → Storage
- Verify **NO tokens** in localStorage/sessionStorage
- Check Cookies tab for HttpOnly cookies (marked as HttpOnly ✓)

### 2. Network Requests:
- Open DevTools → Network
- Make authenticated requests
- Verify `Cookie` header is automatically included
- Verify **NO** `Authorization` header with Bearer token

### 3. Authentication Flow:
```javascript
// Test login
await cookieAuthService.loginWithCredentials(credentials, navigate);

// Test user data fetch (should work without manual token handling)
const user = await cookieAuthService.getCurrentUser();

// Test logout (should clear cookies)
await cookieAuthService.logout(navigate);
```

## 🚀 **Benefits After Implementation**

### Security:
- 🔒 **Zero XSS vulnerability** for tokens
- 🔒 **Automatic CSRF protection**
- 🔒 **No client-side token exposure**

### Developer Experience:
- 🎯 **No token management code**
- 🎯 **Automatic request authentication**
- 🎯 **Simplified error handling**

### Performance:
- ⚡ **Smaller bundle size** (less auth code)
- ⚡ **Faster requests** (no token processing)
- ⚡ **Better caching** (no token-dependent requests)

## 📝 **Next Steps**

1. **Backend Implementation**: Update OAuth and auth endpoints
2. **Frontend Migration**: Switch to cookie-based services
3. **Testing**: Verify no client-side token storage
4. **Deployment**: Update production configuration

The result: **Complete elimination** of client-side token storage while maintaining full authentication functionality!

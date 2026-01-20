// Secure storage utility for handling sensitive data
export class SecureStorage {
  // For non-sensitive data that can use localStorage
  static setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting localStorage item:', error);
    }
  }

  static getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error getting localStorage item:', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing localStorage item:', error);
    }
  }

  // For session-only data
  static setSessionItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting sessionStorage item:', error);
    }
  }

  static getSessionItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.error('Error getting sessionStorage item:', error);
      return null;
    }
  }

  static removeSessionItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing sessionStorage item:', error);
    }
  }

  // Clear all storage
  static clearAll(): void {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  // Encrypt sensitive data before storing (basic implementation)
  static setEncryptedItem(key: string, value: string): void {
    try {
      // Simple base64 encoding (not secure, just obfuscation)
      // In production, use proper encryption library
      const encoded = btoa(value);
      sessionStorage.setItem(key, encoded);
    } catch (error) {
      console.error('Error setting encrypted item:', error);
    }
  }

  static getEncryptedItem(key: string): string | null {
    try {
      const encoded = sessionStorage.getItem(key);
      if (!encoded) return null;
      return atob(encoded);
    } catch (error) {
      console.error('Error getting encrypted item:', error);
      return null;
    }
  }
}

// Cookie utilities for secure token storage
export class CookieStorage {
  static setCookie(name: string, value: string, options: {
    expires?: Date;
    maxAge?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}): void {
    let cookieString = `${name}=${value}`;

    if (options.expires) {
      cookieString += `; expires=${options.expires.toUTCString()}`;
    }

    if (options.maxAge) {
      cookieString += `; max-age=${options.maxAge}`;
    }

    if (options.path) {
      cookieString += `; path=${options.path}`;
    }

    if (options.domain) {
      cookieString += `; domain=${options.domain}`;
    }

    if (options.secure) {
      cookieString += '; secure';
    }

    if (options.httpOnly) {
      cookieString += '; httponly';
    }

    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }

    document.cookie = cookieString;
  }

  static getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  static deleteCookie(name: string, path: string = '/'): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
  }
}

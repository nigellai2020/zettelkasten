import { useState, useEffect } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  expiresAt: number | null;
  loading: boolean;
}

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    expiresAt: null,
    loading: true
  });

  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem('zettelkasten_token');
    const expiresAt = localStorage.getItem('zettelkasten_expires_at');
    
    // Check if token exists and is not expired
    const isTokenValid = token && expiresAt && Date.now() < parseInt(expiresAt);
    
    if (!isTokenValid && token) {
      // Token expired, clean up
      localStorage.removeItem('zettelkasten_token');
      localStorage.removeItem('zettelkasten_expires_at');
    }
    
    setAuth({
      isAuthenticated: !!isTokenValid,
      token: isTokenValid ? token : null,
      expiresAt: isTokenValid && expiresAt ? parseInt(expiresAt) : null,
      loading: false
    });
  }, []);

  const login = async (password: string): Promise<void> => {
    const endpoint = import.meta.env.VITE_WORKER_API_ENDPOINT;
    if (!endpoint) {
      throw new Error('Worker API endpoint is not configured');
    }

    const loginUrl = endpoint.replace(/\/api\/notes\/?$/, '/api/login');
    
    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      const token = data.token;
      const expiresAt = data.expiresAt;

      if (!token) {
        throw new Error('No token received from server');
      }

      // Store token and expiration
      localStorage.setItem('zettelkasten_token', token);
      if (expiresAt) {
        localStorage.setItem('zettelkasten_expires_at', expiresAt.toString());
      }
      
      setAuth({
        isAuthenticated: true,
        token,
        expiresAt,
        loading: false
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    const endpoint = import.meta.env.VITE_WORKER_API_ENDPOINT;
    if (endpoint && auth.token) {
      const logoutUrl = endpoint.replace(/\/api\/notes\/?$/, '/api/logout');
      try {
        await fetch(logoutUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          }
        });
      } catch (error) {
        console.error('Error during logout:', error);
        // Continue with local logout even if server logout fails
      }
    }
    
    localStorage.removeItem('zettelkasten_token');
    localStorage.removeItem('zettelkasten_expires_at');
    setAuth({
      isAuthenticated: false,
      token: null,
      expiresAt: null,
      loading: false
    });
  };

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    
    // Check if token is expired before using it
    if (auth.token && auth.expiresAt && Date.now() >= auth.expiresAt) {
      // Token expired, logout automatically
      logout();
      return headers; // Return empty headers
    }
    
    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } else {
      // Fallback to API key if no token
      const apiKey = import.meta.env.VITE_WORKER_API_KEY;
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }
    }
    
    return headers;
  };

  return {
    ...auth,
    login,
    logout,
    getAuthHeaders
  };
};

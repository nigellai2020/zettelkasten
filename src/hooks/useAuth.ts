import { useState, useEffect } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
}

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    loading: true
  });

  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem('zettelkasten_token');
    setAuth({
      isAuthenticated: !!token,
      token,
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

      if (!token) {
        throw new Error('No token received from server');
      }

      // Store token
      localStorage.setItem('zettelkasten_token', token);
      
      setAuth({
        isAuthenticated: true,
        token,
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
    setAuth({
      isAuthenticated: false,
      token: null,
      loading: false
    });
  };

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    
    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } 
    // else {
    //   // Fallback to API key if no token
    //   const apiKey = import.meta.env.VITE_WORKER_API_KEY;
    //   if (apiKey) {
    //     headers['X-API-Key'] = apiKey;
    //   }
    // }
    
    return headers;
  };

  return {
    ...auth,
    login,
    logout,
    getAuthHeaders
  };
};

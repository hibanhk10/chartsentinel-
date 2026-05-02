/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

// Lightweight JWT parse — no signature verification, just the exp claim.
// We only use this to avoid restoring an obviously-expired session on mount.
function isTokenExpired(token) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return true;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof decoded.exp !== 'number') return false; // no exp = treat as non-expiring
    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true; // malformed token → treat as expired
  }
}

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
        isAuthenticated: false
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false
      };
    case 'REGISTER_START':
      return { ...state, loading: true, error: null };
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true
      };
    case 'REGISTER_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
        isAuthenticated: false
      };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check for existing auth on mount.
    // Reject expired tokens so we don't hand the dashboard a JWT that
    // every subsequent API call will 403 on.
    const token = authService.getToken();
    const user = authService.getCurrentUser();

    if (token && user) {
      if (isTokenExpired(token)) {
        authService.logout();
        return;
      }
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
    }
  }, []);

  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.login(credentials);
      // 2FA gate: server returns a challenge token instead of a session.
      // Stop the loading spinner but don't flip isAuthenticated yet — the
      // caller (LoginModal) reads requires2fa from the response and shows
      // the code-entry step.
      if (response.requires2fa) {
        dispatch({ type: 'LOGIN_FAILURE', payload: null });
        return response;
      }
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response
      });
      return response;
    } catch (error) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error.message
      });
      throw error;
    }
  };

  // Second step of 2FA login. Treated as part of the login flow rather than
  // as a standalone verb so the success path dispatches LOGIN_SUCCESS — same
  // shape, same effect on isAuthenticated, no special handling downstream.
  const verifyTwoFactor = async (challengeToken, code) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.verifyTwoFactor(challengeToken, code);
      dispatch({ type: 'LOGIN_SUCCESS', payload: response });
      return response;
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
      throw error;
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'REGISTER_START' });
    try {
      const response = await authService.register(userData);
      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: response
      });
      return response;
    } catch (error) {
      dispatch({
        type: 'REGISTER_FAILURE',
        payload: error.message
      });
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    dispatch({ type: 'LOGOUT' });
  };

  const value = {
    ...state,
    login,
    verifyTwoFactor,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

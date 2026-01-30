/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

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
    // Check for existing auth on mount
    const token = authService.getToken();
    const user = authService.getCurrentUser();

    if (token && user) {
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token }
      });
    }
  }, []);

  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.login(credentials);
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

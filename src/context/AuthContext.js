import React, { createContext, useContext, useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockLogin, mockRegister } from '../services/api';

const SESSION_KEY = 'session';
const initialState = { user: null, loading: true, error: null };

function reducer(state, action) {
  switch (action.type) {
    case 'RESTORE':
      return { user: action.user, loading: false, error: null };
    case 'START':
      return { ...state, loading: true, error: null };
    case 'SUCCESS':
      return { user: action.user, loading: false, error: null };
    case 'FAIL':
      return { ...state, loading: false, error: action.error };
    case 'LOGOUT':
      return { user: null, loading: false, error: null };
    default:
      return state;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        dispatch({ type: 'RESTORE', user: raw ? JSON.parse(raw) : null });
      } catch {
        dispatch({ type: 'RESTORE', user: null });
      }
    })();
  }, []);

  async function login(email, password) {
    dispatch({ type: 'START' });
    try {
      const user = await mockLogin(email, password);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
      dispatch({ type: 'SUCCESS', user });
    } catch (e) {
      dispatch({ type: 'FAIL', error: e.message });
    }
  }

  async function register(data) {
    dispatch({ type: 'START' });
    try {
      const user = await mockRegister(data);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
      dispatch({ type: 'SUCCESS', user });
    } catch (e) {
      dispatch({ type: 'FAIL', error: e.message });
    }
  }

  async function logout() {
    await AsyncStorage.removeItem(SESSION_KEY);
    dispatch({ type: 'LOGOUT' });
  }

  return (
    <AuthContext.Provider value={{ state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

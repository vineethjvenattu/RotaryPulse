import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setApiChapterId } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for cached user session on mount
  // Use sessionStorage (per-tab) first, fall back to localStorage for single-tab persistence
  useEffect(() => {
    const sessionUser = sessionStorage.getItem("rc_user_session");
    const cachedUser = sessionUser || localStorage.getItem("rc_user_session");
    if (cachedUser) {
      const parsed = JSON.parse(cachedUser);
      setCurrentUser(parsed);
      setApiChapterId(parsed.chapterId);
      // Ensure sessionStorage has the value for this tab
      sessionStorage.setItem("rc_user_session", JSON.stringify(parsed));
    }
    setLoading(false);
  }, []);

  const login = async (email, pin) => {
    const result = await api.login(email, pin);
    if (result.success && result.member) {
      setCurrentUser(result.member);
      setApiChapterId(result.member.chapterId);
      // Store in both: sessionStorage for this tab, localStorage for cross-refresh persistence
      sessionStorage.setItem("rc_user_session", JSON.stringify(result.member));
      localStorage.setItem("rc_user_session", JSON.stringify(result.member));
    }
    return result;
  };

  const setupPin = async (email, pin) => {
    const result = await api.setPin(email, pin);
    if (result.success && result.member) {
      setCurrentUser(result.member);
      setApiChapterId(result.member.chapterId);
      sessionStorage.setItem("rc_user_session", JSON.stringify(result.member));
      localStorage.setItem("rc_user_session", JSON.stringify(result.member));
    }
    return result;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem("rc_user_session");
    localStorage.removeItem("rc_user_session");
  };

  // Helper flags computed from user role
  const role = currentUser ? currentUser["Role"] : "";
  const isPresident = role === "President";
  const isSecretary = role === "Secretary";
  const isTreasurer = role === "Treasurer";
  
  const canManageEvents = isPresident || isSecretary;
  const canMarkAttendance = isPresident || isSecretary;
  const canManagePayments = isPresident || isTreasurer;

  const value = {
    currentUser,
    loading,
    login,
    setupPin,
    logout,
    role,
    isPresident,
    isSecretary,
    isTreasurer,
    canManageEvents,
    canMarkAttendance,
    canManagePayments
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

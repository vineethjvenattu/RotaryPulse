import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for cached user session on mount
  useEffect(() => {
    const cachedUser = localStorage.getItem("rc_user_session");
    if (cachedUser) {
      setCurrentUser(JSON.parse(cachedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, pin) => {
    const result = await api.login(email, pin);
    if (result.success && result.member) {
      setCurrentUser(result.member);
      localStorage.setItem("rc_user_session", JSON.stringify(result.member));
    }
    return result;
  };

  const setupPin = async (email, pin) => {
    const result = await api.setPin(email, pin);
    if (result.success && result.member) {
      setCurrentUser(result.member);
      localStorage.setItem("rc_user_session", JSON.stringify(result.member));
    }
    return result;
  };

  const logout = () => {
    setCurrentUser(null);
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

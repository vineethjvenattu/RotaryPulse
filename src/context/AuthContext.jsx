import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setApiChapterId } from '../services/api';
import { messaging } from '../services/firebase';
import { getToken } from 'firebase/messaging';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [globalConfig, setGlobalConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for cached user session on mount
  // Use sessionStorage (per-tab) first, fall back to localStorage for single-tab persistence
  useEffect(() => {
    const init = async () => {
      // Fetch global config
      const confRes = await api.getGlobalConfig();
      if (confRes.success) {
        setGlobalConfig(confRes.config);
      }

      const sessionUser = sessionStorage.getItem("rc_user_session");
      const cachedUser = sessionUser || localStorage.getItem("rc_user_session");
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser);
        setCurrentUser(parsed);
        setApiChapterId(parsed.chapterId);
        // Ensure sessionStorage has the value for this tab
        sessionStorage.setItem("rc_user_session", JSON.stringify(parsed));
        
        // Background refresh to get the absolute latest fields (e.g. endorsements/badges)
        api.getMember(parsed.chapterId, parsed["Member ID"] || parsed.id).then(res => {
          if (res.success && res.data) {
             const updated = { ...parsed, ...res.data };
             setCurrentUser(updated);
             sessionStorage.setItem("rc_user_session", JSON.stringify(updated));
             localStorage.setItem("rc_user_session", JSON.stringify(updated));
          }
        });
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (memberId, pin) => {
    const result = await api.login(memberId, pin);
    if (result.success && result.member) {
      setCurrentUser(result.member);
      setApiChapterId(result.member.chapterId);
      // Store in both: sessionStorage for this tab, localStorage for cross-refresh persistence
      sessionStorage.setItem("rc_user_session", JSON.stringify(result.member));
      localStorage.setItem("rc_user_session", JSON.stringify(result.member));
      
      // Request Push Notification Permissions
      if (messaging) {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await getToken(messaging);
            if (token) {
              await api.saveFcmToken(result.member.id, token);
            }
          }
        } catch (e) {
          console.warn('Failed to get FCM token', e);
        }
      }
    }
    return result;
  };

  const setupPin = async (memberId, pin) => {
    const result = await api.setPin(memberId, pin);
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

  const isSuperAdmin = currentUser?.isSuperAdmin || (globalConfig?.superAdminEmails || []).includes(currentUser?.Email);
  const enrichedUser = currentUser ? { ...currentUser, isSuperAdmin } : null;

  const value = {
    currentUser: enrichedUser,
    globalConfig,
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

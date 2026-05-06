import React, { createContext, useContext, useState, useEffect } from 'react';
import { account } from '@/lib/appwrite';
import { api } from '@/lib/api';

type UserRole = 'admin' | 'collector' | 'household' | null;

interface AuthContextType {
  user: any;
  role: UserRole;
  isLoading: boolean;
  login: (type: 'admin' | 'collector' | 'household', identifier: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const session = await account.get();
      if (session) {
        setUser(session);
        // Determine role from labels or prefs if using Appwrite Auth
        // For this prototype, we'll check if it's a household/collector via local storage backup
        // or just re-verify from Appwrite
        const savedRole = localStorage.getItem('userRole') as UserRole;
        const savedData = localStorage.getItem('userData');
        if (savedRole) {
          setRole(savedRole);
          if (savedData) setUser(JSON.parse(savedData));
        } else {
            setRole('admin'); // Default if session exists but no role saved
        }
      }
    } catch (error) {
      // No session
      const savedRole = localStorage.getItem('userRole') as UserRole;
      const savedData = localStorage.getItem('userData');
      if (savedRole && savedData) {
          setRole(savedRole);
          setUser(JSON.parse(savedData));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (type: 'admin' | 'collector' | 'household', identifier: string, password?: string) => {
    setIsLoading(true);
    console.log(`[AUTH] Login started. Type: ${type}, ID: ${identifier}`);
    
    // Clear any stale local data
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    
    try {
      let activeUser = null;
      if (type === 'admin' || type === 'collector') {
        try {
            console.log('[AUTH] Step 1: Cleaning existing sessions...');
            try {
                await account.deleteSession('current');
            } catch (e) {
                console.log('[AUTH] No session to clear.');
            }
            
            console.log('[AUTH] Step 2: Requesting session creation from Appwrite...');
            const session = await account.createEmailPasswordSession(identifier, password!);
            console.log('[AUTH] Session created:', session.$id);
            
            // Small artificial delay to allow browser to settle cookies
            await new Promise(res => setTimeout(res, 500));
            
            console.log('[AUTH] Step 3: Verifying account via account.get()...');
            activeUser = await account.get();
            console.log('[AUTH] Verification successful:', activeUser.email);
        } catch (authError: any) {
            console.error('[AUTH] Detailed Appwrite Error:', {
                message: authError.message,
                code: authError.code,
                type: authError.type,
                version: authError.version
            });
            
            // Fallback for Collectors
            if (type === 'collector') {
                console.log('[AUTH] Attempting DB fallback for collector...');
                const collector = await api.getCollectorByEmail(identifier);
                if (collector && collector.password === password) {
                    activeUser = collector;
                } else {
                    throw authError;
                }
            } else {
                throw authError;
            }
        }
        
        if (activeUser) {
          setUser(activeUser);
          setRole(type);
          localStorage.setItem('userRole', type);
          localStorage.setItem('userData', JSON.stringify(activeUser));
        }
      } else if (type === 'household') {
        const household = await api.getHouseholdByEmail(identifier);
        if (!household) throw new Error('Household not found');
        if (household.password !== password) throw new Error('Invalid password');
        
        setUser(household);
        setRole('household');
        localStorage.setItem('userRole', 'household');
        localStorage.setItem('userData', JSON.stringify(household));
      }
    } catch (error: any) {
      // Clear state on failure
      setUser(null);
      setRole(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch (e) {
      console.error("Session delete error:", e);
    }
    setUser(null);
    setRole(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

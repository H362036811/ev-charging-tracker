import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { Profile, UserRole } from '../types';
import { generateId, hashPassword, verifyPassword } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AUTH_KEY = 'ev_charging_auth';
const PROFILES_KEY = 'ev_charging_profiles';

interface AuthContextType {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (username: string, email: string, password: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  createUser: (username: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  getAllUsers: () => Profile[];
  deleteUser: (userId: string) => void;
  autoLogin: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

async function getDefaultProfiles(): Promise<Profile[]> {
  const adminHash = await hashPassword('htl1914');
  const userHash = await hashPassword('xr35-105');
  return [
    { id: 'admin-001', email: '362036811@qq.com', username: 'admin', password_hash: adminHash, role: 'admin', created_by: null, created_at: new Date().toISOString() },
    { id: 'user-yyl', email: '', username: 'yyl', password_hash: userHash, role: 'user', created_by: 'admin-001', created_at: new Date().toISOString() },
    { id: 'user-htl', email: '', username: 'htl', password_hash: userHash, role: 'user', created_by: 'admin-001', created_at: new Date().toISOString() },
  ];
}

function loadProfiles(): Profile[] {
  try {
    const stored = localStorage.getItem(PROFILES_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveProfiles(profiles: Profile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  if (isSupabaseConfigured && supabase) {
    for (const p of profiles) {
      supabase.from('ev_profiles').upsert({
        id: p.id, email: p.email, username: p.username, password_hash: p.password_hash,
        role: p.role, created_by: p.created_by, created_at: p.created_at,
      }).then(() => {}, () => {});
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { initializeAuth(); }, []);

  async function initializeAuth() {
    try {
      setIsLoading(true);
      let profiles = loadProfiles();
      if (profiles.length === 0) {
        profiles = await getDefaultProfiles();
        saveProfiles(profiles);
      }
      const saved = localStorage.getItem(AUTH_KEY);
      if (saved) {
        const session = JSON.parse(saved);
        const found = profiles.find(p => p.id === session.userId);
        if (found) setUser(found);
      }
    } catch (err) { console.error('Auth init error:', err); }
    setIsLoading(false);
  }

  const login = useCallback(async (username: string, password: string) => {
    try {
      const profiles = loadProfiles();
      const found = profiles.find(p => p.username.toLowerCase() === username.toLowerCase() || p.email.toLowerCase() === username.toLowerCase());
      if (!found) return { success: false, error: '\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF' };
      const valid = await verifyPassword(password, found.password_hash);
      if (!valid) return { success: false, error: '\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF' };
      setUser(found);
      localStorage.setItem(AUTH_KEY, JSON.stringify({ userId: found.id, timestamp: Date.now() }));
      if (isSupabaseConfigured && supabase) {
        supabase.from('ev_profiles').update({ last_login: new Date().toISOString() }).eq('id', found.id).then(() => {}, () => {});
      }
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: '\u767B\u5F55\u51FA\u9519' };
    }
  }, []);

  const logout = useCallback(() => { setUser(null); localStorage.removeItem(AUTH_KEY); }, []);

  const register = useCallback(async (username: string, email: string, password: string, role: UserRole = 'user') => {
    const profiles = loadProfiles();
    if (profiles.find(p => p.username.toLowerCase() === username.toLowerCase())) return { success: false, error: '\u7528\u6237\u540D\u5DF2\u5B58\u5728' };
    if (email && profiles.find(p => p.email.toLowerCase() === email.toLowerCase())) return { success: false, error: '\u90AE\u7BB1\u5DF2\u5B58\u5728' };
    const hash = await hashPassword(password);
    const newProfile: Profile = { id: generateId(), email: email || '', username, password_hash: hash, role, created_by: user?.id || null, created_at: new Date().toISOString() };
    profiles.push(newProfile);
    saveProfiles(profiles);
    return { success: true };
  }, [user]);

  const createUser = useCallback(async (username: string, email: string, password: string, role: UserRole) => {
    if (user?.role !== 'admin') return { success: false, error: '\u53EA\u6709\u7BA1\u7406\u5458\u53EF\u4EE5\u521B\u5EFA\u7528\u6237' };
    const profiles = loadProfiles();
    if (profiles.find(p => p.username.toLowerCase() === username.toLowerCase())) return { success: false, error: '\u7528\u6237\u540D\u5DF2\u5B58\u5728' };
    const hash = await hashPassword(password);
    const newProfile: Profile = { id: generateId(), email: email || '', username, password_hash: hash, role, created_by: user.id, created_at: new Date().toISOString() };
    profiles.push(newProfile);
    saveProfiles(profiles);
    return { success: true };
  }, [user]);

  const getAllUsers = useCallback(() => loadProfiles(), []);
  const deleteUser = useCallback((userId: string) => { if (user?.role !== 'admin') return; saveProfiles(loadProfiles().filter(p => p.id !== userId)); }, [user]);
  const autoLogin = useCallback(async () => { try { const saved = localStorage.getItem(AUTH_KEY); if (!saved) return false; const session = JSON.parse(saved); const found = loadProfiles().find(p => p.id === session.userId); if (found) { setUser(found); return true; } } catch {} return false; }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, register, createUser, getAllUsers, deleteUser, autoLogin }}>
      {children}
    </AuthContext.Provider>
  );
}
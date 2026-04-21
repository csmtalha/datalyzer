'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, PlanType, PLAN_LIMITS, PlanLimits } from '@/types/database';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  plan: PlanType;
  limits: PlanLimits;
  loading: boolean;
  configured: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  plan: 'free',
  limits: PLAN_LIMITS.free,
  loading: true,
  configured: false,
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function checkSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes('placeholder') || url.includes('your-project')) return false;
  if (!key.startsWith('eyJ')) return false;
  return true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured] = useState(() => checkSupabaseConfigured());

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) setProfile(data as Profile);
    } catch {
      // profiles table may not exist yet
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    const getUser = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (cancelled) return;
        setUser(currentUser);
        if (currentUser) await fetchProfile(currentUser.id);
      } catch {
        // auth service unavailable
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          if (currentUser) {
            await fetchProfile(currentUser.id);
          } else {
            setProfile(null);
          }
        } catch {
          // ignore
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [configured, fetchProfile]);

  const plan = (profile?.plan ?? 'free') as PlanType;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        plan,
        limits: PLAN_LIMITS[plan],
        loading,
        configured,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

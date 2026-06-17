"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";

interface AuthValue {
  user: User | null;
  loading: boolean;
  displayName: string;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  };

  const signOut = async () => {
    await supabaseBrowser.auth.signOut();
  };

  const displayName =
    (user?.user_metadata?.name as string | undefined) || user?.email?.split("@")[0] || "";

  return (
    <AuthContext.Provider value={{ user, loading, displayName, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

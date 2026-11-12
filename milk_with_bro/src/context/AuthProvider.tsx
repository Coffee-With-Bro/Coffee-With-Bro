import { useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { AuthContext } from "./AuthContext";

function checkInitialRecovery(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hash.includes("type=recovery") || window.location.search.includes("mode=reset");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(checkInitialRecovery);

  useEffect(() => {
    let mounted = true;

    
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        if (error) {
          console.warn("[Supabase Auth] Failed to retrieve session:", error.message);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn("[Supabase Auth] Session fetch exception:", err);
        setLoading(false);
      });

    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
    return { error, user: data.user };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setSession(null);
      setUser(null);
      setIsPasswordRecovery(false);
    }
    return { error };
  };

  const resetPasswordForEmail = async (email: string) => {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/login?mode=reset`
        : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (!error) {
      setIsPasswordRecovery(false);
    }
    return { error };
  };

  const signInWithOAuth = async (provider: "google" | "github") => {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/diagnostics`
        : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isPasswordRecovery,
        signIn,
        signUp,
        signOut,
        resetPasswordForEmail,
        updatePassword,
        signInWithOAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

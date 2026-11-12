import { createContext, useContext } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; user: User | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: "google" | "github") => Promise<{ error: AuthError | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

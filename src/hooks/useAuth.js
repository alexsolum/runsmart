import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuthRedirectUrl } from "../config/runtime";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabaseClient";

export function useAuth() {
  const client = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) {
        setError(sessionError);
      }
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [client]);

  const missingConfigError = new Error(
    "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or runtime-config.js values).",
  );

  const signIn = useCallback(
    async (email, password) => {
      if (!client) throw missingConfigError;
      setError(null);
      setSuccess(null);
      const { data, error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError);
        throw signInError;
      }
      setSuccess("signed-in");
      return data;
    },
    [client],
  );

  const signUp = useCallback(
    async (email, password) => {
      if (!client) throw missingConfigError;
      setError(null);
      setSuccess(null);
      const { data, error: signUpError } = await client.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError);
        throw signUpError;
      }
      setSuccess("signed-up");
      return data;
    },
    [client],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!client) throw missingConfigError;
    setError(null);
    setSuccess(null);
    const { error: oauthError } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    });

    if (oauthError) {
      setError(oauthError);
      throw oauthError;
    }
    setSuccess("oauth-started");
  }, [client]);

  const signOut = useCallback(async () => {
    if (!client) throw missingConfigError;
    setError(null);
    setSuccess(null);
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) {
      setError(signOutError);
      throw signOutError;
    }
    setSuccess("signed-out");
  }, [client]);

  return {
    session,
    user,
    loading,
    error,
    success,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    isConfigured: Boolean(client),
  };
}

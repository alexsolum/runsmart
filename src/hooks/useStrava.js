import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { config, getAuthRedirectUrl } from "../config/runtime";
import { getSupabaseClient } from "../lib/supabaseClient";

function readOAuthParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    code: params.get("code"),
    scope: params.get("scope"),
    error: params.get("error"),
  };
}

function clearOAuthParamsFromUrl() {
  const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash || ""}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

export function useStrava(userId, session, onActivitiesSynced) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [connected, setConnected] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const oauthHandledRef = useRef(false);

  const isConfigured = Boolean(config.stravaClientId && config.supabaseUrl && config.supabaseAnonKey);

  const refreshConnection = useCallback(async () => {
    if (!client || !userId) {
      setConnected(false);
      setLastSyncAt(null);
      return null;
    }

    const { data, error: connectionError } = await client
      .from("strava_connections")
      .select("updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (connectionError) {
      throw connectionError;
    }

    const updatedAt = data?.updated_at ?? null;
    setConnected(Boolean(updatedAt));
    setLastSyncAt(updatedAt);
    return updatedAt;
  }, [client, userId]);

  const getActiveSession = useCallback(async () => {
    if (!client) {
      throw new Error("Supabase is not configured.");
    }

    // After OAuth redirects, auth state hydration can lag behind the first render.
    // Give Supabase a short window to restore a persisted session.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const {
        data: { session: activeSession },
        error: sessionError,
      } = await client.auth.getSession();

      if (sessionError) throw sessionError;
      if (activeSession?.access_token) return activeSession;

      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        window.setTimeout(resolve, 200);
      });
    }

    throw new Error("No active session. Please sign in first.");
  }, [client]);

  const callEdgeFunction = useCallback(
    async (functionName, body) => {
      if (!client) throw new Error("Supabase is not configured.");

      const activeSession = session?.access_token ? session : await getActiveSession();

      const { data, error: invokeError } = await client.functions.invoke(functionName, {
        body,
        headers: {
          Authorization: `Bearer ${activeSession.access_token}`,
        },
      });

      if (invokeError) {
        throw new Error(`${functionName}: ${invokeError.message}`);
      }

      return data;
    },
    [client, getActiveSession, session],
  );

  const startConnect = useCallback(() => {
    if (!userId) {
      throw new Error("Please sign in before connecting Strava.");
    }
    if (!config.stravaClientId) {
      throw new Error("Missing STRAVA_CLIENT_ID in runtime config.");
    }

    const redirectUri = getAuthRedirectUrl();
    const stravaUrl =
      "https://www.strava.com/oauth/authorize" +
      `?client_id=${encodeURIComponent(config.stravaClientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      "&response_type=code" +
      `&scope=${encodeURIComponent("activity:read_all")}` +
      "&approval_prompt=auto";

    window.location.assign(stravaUrl);
  }, [userId]);

  const sync = useCallback(async () => {
    if (!client) throw new Error("Supabase is not configured.");

    setLoading(true);
    setError(null);
    setStatusMessage("Syncing Strava activities…");

    try {
      const result = await callEdgeFunction("strava-sync");
      await refreshConnection();
      if (onActivitiesSynced) {
        await onActivitiesSynced(result);
      }

      if (result.synced > 0) {
        setStatusMessage(`Synced ${result.synced} activities.`);
      } else if (result.total === 0) {
        setStatusMessage("No new activities found.");
      } else {
        setStatusMessage(`Found ${result.total} activities, but none needed syncing.`);
      }

      return result;
    } catch (syncError) {
      setError(syncError);
      setStatusMessage(syncError.message);
      throw syncError;
    } finally {
      setLoading(false);
    }
  }, [callEdgeFunction, client, onActivitiesSynced, refreshConnection]);

  const disconnect = useCallback(async () => {
    if (!client || !userId) throw new Error("Sign in before disconnecting Strava.");
    setLoading(true);
    setError(null);

    const { error: disconnectError } = await client
      .from("strava_connections")
      .delete()
      .eq("user_id", userId);

    if (disconnectError) {
      setLoading(false);
      setError(disconnectError);
      throw disconnectError;
    }

    setConnected(false);
    setLastSyncAt(null);
    setStatusMessage("Strava disconnected.");
    setLoading(false);
  }, [client, userId]);

  useEffect(() => {
    if (!client || !userId) {
      setConnected(false);
      setLastSyncAt(null);
      setStatusMessage("");
      return;
    }

    refreshConnection().catch((refreshError) => {
      setError(refreshError);
      setStatusMessage(refreshError.message);
    });
  }, [client, userId, refreshConnection]);

  useEffect(() => {
    if (!client) return;

    const { code, scope, error: oauthError } = readOAuthParams();
    if (!code && !oauthError) return;
    if (oauthHandledRef.current) return;

    if (oauthError) {
      clearOAuthParamsFromUrl();
      oauthHandledRef.current = true;
      setError(new Error(`Strava authorization failed: ${oauthError}`));
      setStatusMessage("Strava authorization failed.");
      return;
    }

    if (!scope || !scope.includes("activity")) return;
    if (!userId) return;

    oauthHandledRef.current = true;
    clearOAuthParamsFromUrl();

    const handleCode = async () => {
      setLoading(true);
      setError(null);
      setStatusMessage("Completing Strava connection…");

      try {
        await callEdgeFunction("strava-auth", { code });
        setConnected(true);
        await refreshConnection();
        await sync();
      } catch (exchangeError) {
        setError(exchangeError);
        setStatusMessage(exchangeError.message);
      } finally {
        setLoading(false);
      }
    };

    handleCode();
  }, [callEdgeFunction, client, refreshConnection, session?.access_token, sync, userId]);

  return {
    connected,
    lastSyncAt,
    loading,
    error,
    statusMessage,
    isConfigured,
    startConnect,
    sync,
    disconnect,
    refreshConnection,
  };
}

function buildAuthHeaders(accessToken, headers = {}) {
  return {
    ...headers,
    Authorization: `Bearer ${accessToken}`,
  };
}

function isInvalidJwtResponse(data, error) {
  if (data?.code === 401 && data?.message === "Invalid JWT") return true;

  const message = error?.message ?? "";
  return typeof message === "string" && message.includes("Invalid JWT");
}

async function getAccessToken(client) {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;

  const currentSession = data?.session ?? null;
  if (currentSession?.refresh_token) {
    try {
      const { data: refreshed, error: refreshError } = await client.auth.refreshSession();
      if (!refreshError && refreshed?.session?.access_token) {
        return refreshed.session.access_token;
      }
    } catch {
      // Fall back to the currently cached session token when proactive refresh fails.
    }
  }

  if (currentSession?.access_token) {
    return currentSession.access_token;
  }

  const { data: refreshed, error: refreshError } = await client.auth.refreshSession();
  if (refreshError) throw refreshError;

  return refreshed?.session?.access_token ?? null;
}

export async function invokeEdgeFunctionWithSessionRetry(client, functionName, options = {}) {
  const token = await getAccessToken(client);
  if (!token) throw new Error("No active session. Please sign in first.");

  const invoke = (accessToken) =>
    client.functions.invoke(functionName, {
      ...options,
      headers: buildAuthHeaders(accessToken, options.headers),
    });

  let result = await invoke(token);
  if (!isInvalidJwtResponse(result?.data, result?.error)) {
    return result;
  }

  const { data: refreshed, error: refreshError } = await client.auth.refreshSession();
  if (refreshError) throw refreshError;

  const refreshedToken = refreshed?.session?.access_token;
  if (!refreshedToken) {
    throw new Error("No active session. Please sign in first.");
  }

  result = await invoke(refreshedToken);
  return result;
}

export function __testUtils__() {
  return { isInvalidJwtResponse, buildAuthHeaders };
}

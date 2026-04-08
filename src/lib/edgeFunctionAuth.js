function isInvalidJwtResponse(data, error) {
  if (data?.code === 401 && data?.message === "Invalid JWT") return true;

  const message = error?.message ?? "";
  return typeof message === "string" && message.includes("Invalid JWT");
}

async function invokeEdgeFunction(client, functionName, options = {}) {
  return client.functions.invoke(functionName, options);
}

export async function invokeEdgeFunctionWithSessionRetry(client, functionName, options = {}) {
  let result = await invokeEdgeFunction(client, functionName, options);
  if (!isInvalidJwtResponse(result?.data, result?.error)) {
    return result;
  }

  const { data: refreshed, error: refreshError } = await client.auth.refreshSession();
  if (refreshError) throw refreshError;

  if (!refreshed?.session?.access_token) {
    throw new Error("No active session. Please sign in first.");
  }

  result = await invokeEdgeFunction(client, functionName, options);
  return result;
}

export function __testUtils__() {
  return { isInvalidJwtResponse };
}

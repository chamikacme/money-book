import { useAuth } from "@clerk/react";
import { useCallback } from "react";
import { apiRequest } from "./api-client";

export function useApi() {
  const { getToken } = useAuth();
  return useCallback(<T,>(path: string, init?: RequestInit) => getToken().then((token) => apiRequest<T>(path, token, init)), [getToken]);
}

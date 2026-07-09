import React, { Suspense } from "react";
import useSWR from "swr";
import { App, AppLoading } from "./App";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return null;
    }
    const error: any = new Error("An error occurred while fetching the data.");
    // Attach extra info to the error object.
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }
  return await res.json();
};

/**
 *
 */
function useCurrentUser() {
  const { data } = useSWR<{ uid: string }>("/me", fetcher, {
    shouldRetryOnError: false,
    suspense: true,
  });
  return data;
}

function destroyLoginSession() {
  location.href = "/auth/logout";
}

const AppContainer = () => {
  const { uid } = useCurrentUser() ?? {};
  const hash = location.hash;
  const params = hash ? new URLSearchParams(hash.substring(1)) : null;
  const error = params?.get("error") ?? undefined;
  const path = location.pathname;
  return (
    <App
      path={path}
      userId={uid}
      error={error}
      onLogout={destroyLoginSession}
    />
  );
};

const Root = () => (
  <Suspense fallback={<AppLoading />}>
    <AppContainer />
  </Suspense>
);

export default Root;

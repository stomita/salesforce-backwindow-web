import React, { useCallback, useState } from "react";
import useSWR from "swr";
import { AllowedEntry, Org } from ".prisma/client";
import { App } from "./App";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error: any = new Error("An error occurred while fetching the data.");
    // Attach extra info to the error object.
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }
  return res.json();
};

function useCurrentUser() {
  const { data } = useSWR<{ uid: string; isAdmin: boolean }>("/me", fetcher);
  return data;
}

async function createAllowedListEntry(entry: { provider: string, email: string }) {
  const res = await fetch("/org/allowedList", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  const json = await res.json();
  return json;
}

async function deleteAllowedListEntry(id: number) {
  const res = await fetch(`/org/allowedList/${id}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
}

async function updateOrg(params: {
  appClientId: string;
  appPrivateKey?: string;
}) {
  const res = await fetch("/org", {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  const json = await res.json();
  return json;
}

async function destroyOrg() {
  const res = await fetch("/org", {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
}

/**
 *
 */
function useHubOrg() {
  const { data: org, mutate } = useSWR<{
    appClientId?: string;
    allowedList?: AllowedEntry[];
  }>("/org", fetcher);
  const { appClientId, allowedList = [] } = org ?? {};
  const onCreateAllowedEntry = useCallback(
    async (provider: string, email: string) => {
      const entry = await createAllowedListEntry({ provider, email });
      mutate({ ...org, allowedList: [...allowedList, entry] });
    },
    [org]
  );
  const onDeleteAllowedEntry = useCallback(
    async (id: number) => {
      await deleteAllowedListEntry(id);
      mutate({
        ...org,
        allowedList: allowedList.filter((entry) => entry.id !== id),
      });
    },
    [org]
  );
  const onUpdateConnectedApp = useCallback(
    async (params: { appId: string; privateKey?: string }) => {
      console.log('onUpdateConnectedApp', params);
      const { appId: appClientId, privateKey: appPrivateKey } = params;
      await updateOrg({ appClientId, appPrivateKey });
      mutate({
        ...org,
        appClientId,
      });
    },
    [org]
  );
  const onUnregisterOrg = useCallback(async () => {
    await destroyOrg();
    destroyLoginSession();
  }, []);
  return {
    appClientId,
    allowedList,
    onCreateAllowedEntry,
    onDeleteAllowedEntry,
    onUpdateConnectedApp,
    onUnregisterOrg,
  };
}

function loginToSalesforce() {
  location.href = "/auth/salesforce";
}

function destroyLoginSession() {
  location.href = "/auth/logout";
}

const Root = () => {
  const { uid, isAdmin } = useCurrentUser() ?? {};
  const {
    appClientId,
    allowedList,
    onCreateAllowedEntry,
    onDeleteAllowedEntry,
    onUpdateConnectedApp,
    onUnregisterOrg,
  } = useHubOrg();
  const hash = location.hash;
  const params = hash ? new URLSearchParams(hash.substring(1)) : null;
  const error = params?.get("error") ?? undefined;
  const path = location.pathname;
  return (
    <App
      path={path}
      userId={uid}
      isAdmin={isAdmin}
      error={error}
      appId={appClientId}
      allowedEntryList={allowedList}
      onUpdateConnectedApp={onUpdateConnectedApp}
      onCreateAllowedEntry={onCreateAllowedEntry}
      onDeleteAllowedEntry={onDeleteAllowedEntry}
      onUnregisterOrg={onUnregisterOrg}
      onLogin={loginToSalesforce}
      onLogout={destroyLoginSession}
    />
  );
};

export default Root;

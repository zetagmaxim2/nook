import { useCallback, useEffect, useState } from "react";
import { all } from "./db";
import type { StoreName } from "./types";
export function useStore<T>(store: StoreName, signal = 0) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(
    () =>
      all<T>(store)
        .then(setItems)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    [store],
  );
  useEffect(() => {
    reload();
  }, [reload, signal]);
  return { items, setItems, loading, error, reload };
}
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const fn = () => setOnline(navigator.onLine);
    addEventListener("online", fn);
    addEventListener("offline", fn);
    return () => {
      removeEventListener("online", fn);
      removeEventListener("offline", fn);
    };
  }, []);
  return online;
}

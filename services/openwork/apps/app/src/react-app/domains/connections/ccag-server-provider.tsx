/** @jsxImportSource react */
import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { CcagServerStore } from "./ccag-server-store";

const CcagServerContext = createContext<CcagServerStore | null>(null);

export function CcagServerProvider(props: {
  store: CcagServerStore;
  children: ReactNode;
}) {
  return (
    <CcagServerContext.Provider value={props.store}>
      {props.children}
    </CcagServerContext.Provider>
  );
}

export function useCcagServer() {
  const store = useContext(CcagServerContext);
  if (!store) {
    throw new Error("useCcagServer must be used within an CcagServerProvider");
  }

  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  return store;
}

import { contextBridge, ipcRenderer } from "electron";

const NATIVE_DEEP_LINK_EVENT = "ccag:deep-link-native";

function normalizePlatform(value) {
  if (value === "darwin" || value === "linux") return value;
  if (value === "win32") return "windows";
  return "linux";
}

contextBridge.exposeInMainWorld("__CCAG_ELECTRON__", {
  invokeDesktop(command, ...args) {
    return ipcRenderer.invoke("ccag:desktop", command, ...args);
  },
  shell: {
    openExternal(url) {
      return ipcRenderer.invoke("ccag:shell:openExternal", url);
    },
    relaunch() {
      return ipcRenderer.invoke("ccag:shell:relaunch");
    },
  },
  migration: {
    readSnapshot() {
      return ipcRenderer.invoke("ccag:migration:read");
    },
    ackSnapshot() {
      return ipcRenderer.invoke("ccag:migration:ack");
    },
  },
  updater: {
    check() {
      return ipcRenderer.invoke("ccag:updater:check");
    },
    download() {
      return ipcRenderer.invoke("ccag:updater:download");
    },
    installAndRestart() {
      return ipcRenderer.invoke("ccag:updater:installAndRestart");
    },
  },
  meta: {
    initialDeepLinks: [],
    platform: normalizePlatform(process.platform),
    version: process.versions.electron,
  },
});

ipcRenderer.on(NATIVE_DEEP_LINK_EVENT, (_event, urls) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NATIVE_DEEP_LINK_EVENT, { detail: urls }));
});

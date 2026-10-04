import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Auth tokens live ONLY in Expo SecureStore (Keychain / Android Keystore-backed).
 * The web branch exists solely so the UI can be previewed in a desktop browser during development;
 * web is not a shipped target of this app.
 */
const ACCESS = 'auth.accessToken';
const REFRESH = 'auth.refreshToken';

const isWeb = Platform.OS === 'web';

async function get(key: string): Promise<string | null> {
  try {
    return isWeb ? globalThis.localStorage?.getItem(key) ?? null : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}
async function set(key: string, value: string) {
  if (isWeb) return globalThis.localStorage?.setItem(key, value);
  await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
}
async function del(key: string) {
  try {
    if (isWeb) globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    /* nothing to delete */
  }
}

export const tokenStorage = {
  getAccess: () => get(ACCESS),
  getRefresh: () => get(REFRESH),
  async save(accessToken: string, refreshToken: string) {
    await set(ACCESS, accessToken);
    await set(REFRESH, refreshToken);
  },
  async clear() {
    await del(ACCESS);
    await del(REFRESH);
  },
  /** Non-secret UI preference (selected property) kept next to the tokens to avoid another dependency. */
  getPref: (k: string) => get(`pref.${k}`),
  setPref: (k: string, v: string) => set(`pref.${k}`, v),
  delPref: (k: string) => del(`pref.${k}`),
};

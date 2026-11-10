import * as SecureStore from "expo-secure-store";
export const memberStorage = {
  read: () => SecureStore.getItemAsync("chj_member_session"),
  write: (value: string) =>
    SecureStore.setItemAsync("chj_member_session", value),
  clear: () => SecureStore.deleteItemAsync("chj_member_session"),
};

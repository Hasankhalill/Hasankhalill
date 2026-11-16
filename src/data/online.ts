import * as Network from "expo-network";

export async function phoneIsOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  if (!state.isConnected) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function subscribeOnline(onChange: (online: boolean) => void): () => void {
  const subscription = Network.addNetworkStateListener((state) => {
    const online = Boolean(state.isConnected) && state.isInternetReachable !== false;
    onChange(online);
  });
  return () => subscription.remove();
}

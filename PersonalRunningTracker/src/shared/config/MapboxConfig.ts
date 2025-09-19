import Constants from 'expo-constants';

const extra = (Constants?.expoConfig as any)?.extra || {};

export const MapboxConfig = {
  // Token resolution order: Expo extra -> process.env -> hardcoded fallback
  ACCESS_TOKEN:
    (extra.MAPBOX_ACCESS_TOKEN as string) ||
    ((typeof process !== 'undefined' && (process as any).env && (process as any).env.MAPBOX_ACCESS_TOKEN) as string) ||
    '',
  // Default app-wide style (feed thumbnails). Run Details uses satellite by default.
  STYLE_ID: 'mapbox/streets-v11',
};

export const hasMapboxToken = (): boolean => !!MapboxConfig.ACCESS_TOKEN;

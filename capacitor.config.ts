import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rihla.arabic',
  appName: 'Rihla',
  webDir: 'public',
  server: {
    url: 'https://rihla-arabic.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;

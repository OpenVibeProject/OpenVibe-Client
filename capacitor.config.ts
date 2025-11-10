import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'OpenVibe',
  webDir: 'dist',
  server: {
    allowNavigation: ['*'],
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;

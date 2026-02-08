import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.cloudbox',
  appName: '云box',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      backgroundColor: '#0a0a0a',
      style: 'Dark'
    },
    NavigationBar: {
      backgroundColor: '#0a0a0a'
    }
  }
};

export default config;


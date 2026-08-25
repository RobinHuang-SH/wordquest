import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.wordquest.english',
  appName: '词境英语',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#f4f0e7',
  },
}

export default config

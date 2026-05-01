import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.esterlin.studyquest',
  appName: 'StudyQuest',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

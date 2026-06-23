import Constants from 'expo-constants';

type Env = {
  APP_ENV: 'development' | 'staging' | 'production';
  API_BASE_URL: string;
  SENTRY_DSN: string;
};

const env = Constants.expoConfig?.extra as Env;

export const isDev = env.APP_ENV === 'development';
export const isStaging = env.APP_ENV === 'staging';
export const isProd = env.APP_ENV === 'production';
export default env;

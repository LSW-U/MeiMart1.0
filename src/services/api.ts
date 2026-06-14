import axios from 'axios';
import Constants from 'expo-constants';

const env = Constants.expoConfig?.extra as {
  APP_ENV: 'development' | 'staging' | 'production';
  API_BASE_URL: string;
  SENTRY_DSN: string;
};

export const api = axios.create({
  baseURL: env?.API_BASE_URL ?? 'https://api.meimart.example.com',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);

export const isMockMode = env?.APP_ENV === 'development';

import * as dotenv from 'dotenv';
dotenv.config();

const cfEnv = (process.env.CASHFREE_ENV ?? 'TEST').toUpperCase();

export const cashfreeConfig = {
  appId:     process.env.CASHFREE_APP_ID     ?? '',
  secretKey: process.env.CASHFREE_SECRET_KEY ?? '',
  env:       cfEnv as 'TEST' | 'PRODUCTION',
  apiBase:   cfEnv === 'PRODUCTION'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg',
} as const;
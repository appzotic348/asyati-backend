export const adminJwtConfig = {
  secret: process.env.ADMIN_JWT_SECRET ?? 'admin_secret_fallback',
  expiresIn: process.env.ADMIN_JWT_EXPIRES_IN ?? '7d',
};

export const customerJwtConfig = {
  secret: process.env.CUSTOMER_JWT_SECRET ?? 'customer_secret_fallback',
  expiresIn: process.env.CUSTOMER_JWT_EXPIRES_IN ?? '30d',
};
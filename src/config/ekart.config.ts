import * as dotenv from 'dotenv';
dotenv.config();

export const ekartConfig = {
  clientId: process.env.EKART_CLIENT_ID ?? '',
  username:  process.env.EKART_USERNAME  ?? '',
  password:  process.env.EKART_PASSWORD  ?? '',

  apiBase: 'https://app.elite.ekartlogistics.in/integrations/v2',

  sellerGstTin: process.env.EKART_SELLER_GST_TIN ?? 'NA',

  pickupAlias: process.env.EKART_PICKUP_ALIAS ?? '',

  pickup: {
    name:    process.env.EKART_PICKUP_NAME    ?? '',
    address: process.env.EKART_PICKUP_ADDRESS ?? '',
    city:    process.env.EKART_PICKUP_CITY    ?? '',
    state:   process.env.EKART_PICKUP_STATE   ?? '',
    pincode: process.env.EKART_PICKUP_PINCODE ?? '',
    phone:   process.env.EKART_PICKUP_PHONE   ?? '',
  },

  webhook: {
    secret: process.env.EKART_WEBHOOK_SECRET ?? '',
    id:     process.env.EKART_WEBHOOK_ID     ?? '',
  },
} as const;
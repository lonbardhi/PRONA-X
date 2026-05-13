import "server-only";

export type WhatsAppConfig = {
  accessToken: string | null;
  appSecret: string | null;
  businessAccountId: string | null;
  graphApiVersion: string;
  phoneNumberId: string | null;
  verifyToken: string | null;
};

export function getWhatsAppConfig(): WhatsAppConfig {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || null,
    appSecret: process.env.WHATSAPP_APP_SECRET || null,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null,
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || "v20.0",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || null,
  };
}

export function isWhatsAppConfigured() {
  const config = getWhatsAppConfig();

  return Boolean(
    config.accessToken &&
      config.phoneNumberId &&
      config.verifyToken,
  );
}


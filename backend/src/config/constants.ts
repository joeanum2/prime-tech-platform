export const IDENTIFIERS = {
  ORD: {
    prefix: "ORD",
    regex: /^ORD-[0-9]{8}-[A-Z0-9]{4}$/
  },
  INV: {
    prefix: "INV",
    regex: /^INV-[0-9]{4}-[0-9]{6}$/
  },
  RCP: {
    prefix: "RCP",
    regex: /^RCP-[0-9]{4}-[0-9]{6}$/
  },
  LIC: {
    prefix: "LIC",
    regex: /^LIC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
  },
  BKG: {
    prefix: "BKG",
    regex: /^BKG-[A-Z0-9]{8}$/
  }
} as const;

export const DEFAULTS = {
  SIGNED_URL_TTL_SECONDS: 600,
  CURRENCY: "GBP"
} as const;

export const BOOKING_STATUS = ["NEW","CONFIRMED","IN_PROGRESS","COMPLETED","CANCELLED"] as const;
export const ORDER_STATUS = ["PENDING_PAYMENT","PAID","FAILED","CANCELLED"] as const;
export const LICENCE_STATUS = ["ACTIVE","REVOKED"] as const;
export const USER_ROLES = ["USER","STAFF","ADMIN"] as const;

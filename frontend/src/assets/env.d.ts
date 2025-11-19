/// <reference types="vite/client" />
declare interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_PRODUCT_BASE?: string
  readonly VITE_USER_BASE?: string
  readonly VITE_ORDER_BASE?: string
  readonly VITE_PAYMENT_BASE?: string
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv
}

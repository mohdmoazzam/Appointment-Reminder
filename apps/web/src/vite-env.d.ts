/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API. Defaults to "/api" (proxied to the NestJS server in development). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

declare module "*.peggy" {
  const parse: (input: string) => unknown;
  export { parse };
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

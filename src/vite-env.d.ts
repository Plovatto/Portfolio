interface ImportMetaEnv {
  readonly VITE_CONTACT_ENDPOINT?: string
  readonly VITE_TURNSTILE_SITE_KEY?: string
  readonly VITE_GA_ID?: string
  readonly VITE_CLARITY_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

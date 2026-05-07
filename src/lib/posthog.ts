// PostHog public *project* API key — write-only by design and intended to
// ship in client-side JavaScript. PostHog documents this token as safe to
// expose; secret scanners (GitGuardian, etc.) still flag it, so this file is
// the single source of truth and is allow-listed in .gitguardian.yaml.
//
// See: https://posthog.com/docs/api#how-to-authenticate-with-the-public-api
export const POSTHOG_TOKEN = 'phc_3DIgL4ES4ukoFmH4hgg3jR0e6O52PiQIfzfsVEjJu9u';
export const POSTHOG_HOST = 'https://us.i.posthog.com';

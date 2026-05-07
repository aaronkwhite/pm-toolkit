// Source of truth: PostHog feature flag `site-hidden-versions`. Its JSON
// payload is an array of bare-semver strings (e.g. ["0.8.0"]) that the site
// should not advertise — used when a GitHub release lands before the VS Code
// Marketplace / Open VSX equivalents are published.
//
// Resolved at build time via PostHog's public /flags endpoint. If the call
// fails we fail closed (use FAILSAFE_HIDDEN) so an outage cannot leak an
// unreleased version into the rendered HTML or JSON-LD.

import { POSTHOG_HOST, POSTHOG_TOKEN } from './posthog';

const FLAG_KEY = 'site-hidden-versions';
const FAILSAFE_HIDDEN: readonly string[] = ['0.8.0'];

const FALLBACK_VERSION = '0.7.3';

// The next version that has shipped to GitHub-but-not-marketplaces, used to
// pre-render an "alternate" hero version chip and changelog entry that the
// `site-show-v0-8` PostHog flag can reveal at runtime without a rebuild.
// Hardcoded because the GitHub releases API can't return a tag that doesn't
// exist yet. Drop this constant when v0.8.0 ships to the marketplaces.
const EXPECTED_NEXT_VERSION = '0.8.0';

function strip(tag: string): string {
  return (tag || '').replace(/^v/, '');
}

export interface VersionResult {
  /** Bare semver, e.g. "0.7.3" */
  version: string;
  /** Tag form, e.g. "v0.7.3" */
  tag: string;
}

let hiddenPromise: Promise<Set<string>> | null = null;

export function getHiddenVersions(): Promise<Set<string>> {
  if (hiddenPromise) return hiddenPromise;
  hiddenPromise = (async () => {
    try {
      const res = await fetch(`${POSTHOG_HOST}/flags/?v=2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: POSTHOG_TOKEN,
          distinct_id: 'pmt-website-build',
        }),
      });
      if (res.ok) {
        const data: any = await res.json();
        const entry = data?.flags?.[FLAG_KEY];
        if (entry && entry.enabled) {
          const raw = entry.metadata?.payload;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (Array.isArray(parsed)) {
            return new Set(parsed.map((v) => strip(String(v))));
          }
        }
        // Flag disabled or missing payload → nothing hidden.
        return new Set<string>();
      }
    } catch {}
    return new Set(FAILSAFE_HIDDEN);
  })();
  return hiddenPromise;
}

/**
 * Returns the latest GitHub release whose tag is not in the
 * `site-hidden-versions` PostHog flag payload. Falls back to the last
 * marketplace-published version on any error.
 */
export async function getLatestPublicVersion(): Promise<VersionResult> {
  const hidden = await getHiddenVersions();
  try {
    const res = await fetch(
      'https://api.github.com/repos/aaronkwhite/pm-toolkit/releases?per_page=10',
    );
    if (res.ok) {
      const releases = (await res.json()) as Array<{
        tag_name?: string;
        draft?: boolean;
        prerelease?: boolean;
      }>;
      const pick = releases.find(
        (r) =>
          r &&
          r.tag_name &&
          !r.draft &&
          !r.prerelease &&
          !hidden.has(strip(r.tag_name)),
      );
      if (pick && pick.tag_name) {
        const version = strip(pick.tag_name);
        return { version, tag: `v${version}` };
      }
    }
  } catch {}
  return { version: FALLBACK_VERSION, tag: `v${FALLBACK_VERSION}` };
}

/**
 * The runtime-flag-revealed "next" version. Paired with `getLatestPublicVersion`
 * so pages can render both the safe default and the flag-revealed value, then
 * swap between them based on the `site-show-v0-8` PostHog flag.
 */
export function getExpectedNextVersion(): VersionResult {
  return { version: EXPECTED_NEXT_VERSION, tag: `v${EXPECTED_NEXT_VERSION}` };
}

// Versions present on GitHub but not yet published to the VS Code Marketplace
// or Open VSX. The site should not advertise these as the current release.
export const HIDDEN_VERSIONS = new Set<string>(['0.8.0']);

const FALLBACK = '0.7.3';

function strip(tag: string): string {
  return (tag || '').replace(/^v/, '');
}

function isHidden(tag: string): boolean {
  return HIDDEN_VERSIONS.has(strip(tag));
}

export interface VersionResult {
  /** Bare semver, e.g. "0.7.3" */
  version: string;
  /** Tag form, e.g. "v0.7.3" */
  tag: string;
}

/**
 * Returns the latest release tag from GitHub that is not in HIDDEN_VERSIONS.
 * Falls back to the last marketplace-published version on any error.
 */
export async function getLatestPublicVersion(): Promise<VersionResult> {
  try {
    const res = await fetch(
      'https://api.github.com/repos/aaronkwhite/pm-toolkit/releases?per_page=10',
    );
    if (res.ok) {
      const releases = (await res.json()) as Array<{ tag_name?: string; draft?: boolean; prerelease?: boolean }>;
      const pick = releases.find(
        (r) => r && r.tag_name && !r.draft && !r.prerelease && !isHidden(r.tag_name),
      );
      if (pick && pick.tag_name) {
        const version = strip(pick.tag_name);
        return { version, tag: `v${version}` };
      }
    }
  } catch {}
  return { version: FALLBACK, tag: `v${FALLBACK}` };
}

# AGENTS.md - Operational Triggers

This file defines **mandatory actions** that AI agents MUST complete after certain events. These are not suggestions - they are requirements.

> **How this differs from CLAUDE.md**: CLAUDE.md explains *how* to do things. This file defines *when* you MUST do them automatically.

---

## After Committing Code Changes

**BEFORE ending your turn**, verify and complete:

- [ ] **Version bump needed?** Check if commit includes `feat:` or `fix:`
  - `feat:` → `npm version minor --no-git-tag-version`
  - `fix:` → `npm version patch --no-git-tag-version`
- [ ] **CHANGELOG.md updated** with the changes under correct version header
- [ ] **Version bump committed** with message: `chore: bump version to X.Y.Z`

### Quick Reference

| Commit Type | Version Action | CHANGELOG |
|-------------|----------------|-----------|
| `feat:` | MINOR bump | Required |
| `fix:` | PATCH bump | Required |
| `docs:` | None | None |
| `test:` | PATCH bump | Required |
| `chore:` | None | None |
| Breaking change | MAJOR bump | Required |

---

## After Merging to Main (or completing a feature branch)

**MUST complete before moving on:**

- [ ] Create git tag: `git tag vX.Y.Z`
- [ ] Push tag: `git push origin vX.Y.Z`
- [ ] Create GitHub release:
  ```bash
  gh release create vX.Y.Z --title "vX.Y.Z" --notes "$(cat <<'EOF'
  ## Changes
  [Copy relevant section from CHANGELOG.md]
  EOF
  )"
  ```
- [ ] Attach `.vsix` file if available: `gh release upload vX.Y.Z pm-toolkit-X.Y.Z.vsix`

---

## After Implementing a Feature

**MUST complete:**

- [ ] Add or update E2E tests in `tests/e2e/`
- [ ] Update `README.md` if the feature is user-facing
- [ ] Close related GitHub issue with a comment explaining the implementation
- [ ] Update `docs/planning/` if the change is architectural

---

## After Fixing a Bug

**MUST complete:**

- [ ] Add regression test to prevent recurrence
- [ ] Update CHANGELOG.md with fix description
- [ ] Reference issue number in commit: `fix: description (#123)`

---

## Change Type Matrix

Use this table to determine required actions:

| Change Type | Version | CHANGELOG | Tag/Release | Tests | README |
|-------------|---------|-----------|-------------|-------|--------|
| Bug fix | PATCH | ✓ | ✓ | ✓ | - |
| New feature | MINOR | ✓ | ✓ | ✓ | ✓ |
| Breaking change | MAJOR | ✓ | ✓ | ✓ | ✓ |
| Docs only | - | - | - | - | - |
| Tests only | PATCH | ✓ | Optional | - | - |
| Refactor | PATCH | ✓ | Optional | ✓ | - |
| Dependencies | PATCH | ✓ | Optional | - | - |

---

## Pre-Commit Checklist

Before ANY commit, verify:

- [ ] Code compiles: `npm run compile`
- [ ] Tests pass: `npm run test:e2e`
- [ ] No console.log statements left in code
- [ ] Dark and light themes both work (if UI changes)

---

## End of Session Checklist

Before ending work on this project:

- [ ] All changes committed (check `git status`)
- [ ] Version bumped if needed
- [ ] CHANGELOG.md is current
- [ ] No uncommitted work left behind
- [ ] Inform user of any pending release steps

---

## Enforcement

These triggers are MANDATORY. Do not skip them because:
- "It's a small change" - Small changes still need versioning
- "I'll do it later" - Do it now, before ending your turn
- "The user didn't ask" - These are automatic, not requested

If you cannot complete a trigger (e.g., no GitHub access), explicitly inform the user what remains to be done.

# Repository identity

Baxtori treats `Baxtori/baxtori` as the canonical repository identity.

Two earlier names remain supported read aliases for durable data:

- `teamleaderleo/baxtori` — the personal-account repository before the organization transfer
- `teamleaderleo/glimpse` — the product name before the Baxtori rename

Aliases apply to:

- account-backed repository selections
- map and question state keys
- queued re-review requests
- versioned editions and repository-map history
- code and diff evidence requests

Active configuration must use `Baxtori/baxtori`. The scope, collector source
manifest, and repository-map registry validators reject either historical alias
so new data cannot drift backward. Historical edition records and commit URLs do
not need destructive rewrites; runtime and compiler boundaries canonicalize them
before matching repositories or calling GitHub.

## Migration rule

Canonical data wins when several identities are present. Historical state fills
a canonical key only when no canonical value exists. The precedence is therefore
an explicit current value first, followed by the first historical value encountered.
This preserves the newest reader choice while allowing older state to reappear
after either rename.

## Removal boundary

Do not remove either alias while durable editions, map reviews, run receipts, or
account state can still contain an earlier repository name. Add a migration test
whenever the canonical owner or repository name changes again.

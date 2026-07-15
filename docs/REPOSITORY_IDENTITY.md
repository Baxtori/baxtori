# Repository identity

Baxtori treats `teamleaderleo/baxtori` as the canonical repository identity.

The former `teamleaderleo/glimpse` name remains a supported read alias for durable data that predates the GitHub rename:

- account-backed repository selections
- map and question state keys
- queued re-review requests
- versioned editions and repository-map history
- code and diff evidence requests

Active configuration must use the canonical name. The scope, collector source manifest, and repository-map registry validators reject the legacy alias so new data cannot drift backward.

## Migration rule

Canonical data wins when both identities are present. Legacy state fills a canonical key only when no canonical value exists. This preserves the newest explicit reader choice while allowing older state to reappear after the rename.

## Removal boundary

Do not remove the alias while durable editions, map reviews, or account state can still contain the former repository name. Historical data stays inspectable; runtime boundaries canonicalize it before matching repositories or calling GitHub.

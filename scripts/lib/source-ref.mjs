const BRANCH_PATTERN = /^(?!\/)(?!.*\.\.)(?!.*\/\/)[A-Za-z0-9._/-]+$/;

export function sourceReviewRef(source) {
  const branch = source.branch ?? "main";
  if (!BRANCH_PATTERN.test(branch)) throw new Error(`Invalid GitHub branch for ${source.fullName}: ${branch}`);
  return { branch, reviewRef: `refs/remotes/origin/${branch}` };
}

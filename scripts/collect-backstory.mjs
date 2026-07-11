import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(resolve(root, "baxtori.sources.json"), "utf8"));
const since = new Date(Date.now() - config.windowDays * 86_400_000).toISOString();

function git(repositoryPath, args) {
  return execFileSync("git", ["-C", repositoryPath, ...args], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function collectRepository(source) {
  const repositoryPath = resolve(root, source.path);
  try {
    try {
      git(repositoryPath, ["rev-parse", "--verify", "HEAD"]);
    } catch {
      return {
        additions: 0,
        commits: [],
        deletions: 0,
        empty: true,
        error: null,
        fullName: source.fullName,
        name: source.name,
        repositoryPath,
        routineOnly: false,
        testFiles: [],
        touchedFiles: [],
      };
    }
    const commits = git(repositoryPath, [
      "log",
      `--since=${since}`,
      "--no-merges",
      "--date=iso-strict",
      "--pretty=format:__COMMIT__%n%H%n%h%n%aI%n%an%n%s",
      "--numstat",
      "--",
    ]);
    const entries = commits
      .split("__COMMIT__\n")
      .filter(Boolean)
      .map((entry) => {
        const [sha, shortSha, date, author, subject, ...stats] = entry.trim().split("\n");
        const files = stats.filter(Boolean).map((line) => {
          const [added, deleted, ...pathParts] = line.split("\t");
          return {
            added: added === "-" ? null : Number(added),
            deleted: deleted === "-" ? null : Number(deleted),
            path: pathParts.join("\t"),
          };
        });
        return {
          author,
          date,
          files,
          sha,
          shortSha,
          subject,
          url: `https://github.com/${source.fullName}/commit/${sha}`,
        };
      });

    const touchedFiles = [...new Set(entries.flatMap((commit) => commit.files.map((file) => file.path)))];
    const additions = entries.flatMap((commit) => commit.files).reduce((sum, file) => sum + (file.added ?? 0), 0);
    const deletions = entries.flatMap((commit) => commit.files).reduce((sum, file) => sum + (file.deleted ?? 0), 0);
    const testFiles = touchedFiles.filter((path) => /(^|\/)(test|tests|__tests__)(\/|\.)|\.test\.|\.spec\./i.test(path));
    const routineOnly = touchedFiles.length > 0 && touchedFiles.every((path) =>
      /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|README\.md|CHANGELOG\.md)$/i.test(path),
    );

    return {
      additions,
      commits: entries,
      deletions,
      error: null,
      fullName: source.fullName,
      name: source.name,
      repositoryPath,
      routineOnly,
      testFiles,
      touchedFiles,
    };
  } catch (error) {
    return {
      commits: [],
      error: error instanceof Error ? error.message.split("\n")[0] : "Repository could not be read.",
      fullName: source.fullName,
      name: source.name,
      repositoryPath,
      touchedFiles: [],
    };
  }
}

const repositories = config.repositories.map(collectRepository);
const output = {
  collectedAt: new Date().toISOString(),
  instructions: {
    evidenceRule: "Every claim must be supported by the listed commits and files. Do not infer unobserved behavior.",
    quietRule: "Publish no story for repositories with no commits or only routine lockfile/documentation churn unless that churn changes behavior.",
    storyLimit: 5,
  },
  periodEnd: new Date().toISOString().slice(0, 10),
  periodStart: since.slice(0, 10),
  repositories,
  windowDays: config.windowDays,
};

await mkdir(resolve(root, "data"), { recursive: true });
await writeFile(resolve(root, "data/candidates.json"), `${JSON.stringify(output, null, 2)}\n`);

const active = repositories.filter((repository) => repository.commits.length && !repository.routineOnly).length;
console.log(`Collected ${repositories.length} repositories; ${active} have potentially meaningful changes.`);

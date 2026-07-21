import { createHash } from "node:crypto";

export const REVIEW_RUN_SCHEMA_VERSION = 1;

export function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function instructionVersion(markdown) {
  const match = markdown.match(/Instruction version:\s*\*\*(\d+)\*\*/i);
  if (!match) throw new Error("Codex review instructions need a numeric instruction version.");
  return Number(match[1]);
}

function feedbackRequestIds(candidates) {
  return (candidates.readerFeedback?.reviewRequests ?? [])
    .map((request) => request._id ?? request.id)
    .filter((id) => typeof id === "string" && id);
}

export function buildPreparedReviewRun({ candidates, candidateText, instructionText, now, runtime }) {
  const inputHash = sha256Text(candidateText);
  const collectedAt = candidates.collectedAt;
  if (!Date.parse(collectedAt)) throw new Error("Candidate input needs a valid collectedAt timestamp.");
  const runId = `${collectedAt.replace(/[:.]/g, "-")}-${inputHash.slice(0, 12)}`;

  return {
    schemaVersion: REVIEW_RUN_SCHEMA_VERSION,
    runId,
    preparedAt: now.toISOString(),
    instruction: {
      path: "codex/review-instructions.md",
      sha256: sha256Text(instructionText),
      version: instructionVersion(instructionText),
    },
    input: {
      collectedAt,
      path: "data/candidates.json",
      sha256: inputHash,
    },
    model: process.env.CODEX_MODEL?.trim() || null,
    runtime: {
      codex: process.env.CODEX_RUNTIME_VERSION?.trim() || null,
      node: runtime.node,
      platform: runtime.platform,
    },
    sources: (candidates.repositories ?? []).map((repository) => ({
      baseSha: repository.collection?.baseSha ?? null,
      commitCount: repository.commits?.length ?? 0,
      fetchError: repository.fetchError ?? null,
      headSha: repository.collection?.headSha ?? repository.headSha ?? null,
      historyRewritten: repository.collection?.historyRewritten ?? false,
      mode: repository.collection?.mode ?? "unknown",
      repository: repository.fullName,
    })),
    availableFeedbackIds: feedbackRequestIds(candidates),
    processedFeedbackIds: [],
    humanEdits: [],
    output: null,
    validations: [],
  };
}

export function validatePreparedReviewRun(manifest) {
  if (manifest.schemaVersion !== REVIEW_RUN_SCHEMA_VERSION) throw new Error("Unsupported review-run schema version.");
  if (!manifest.runId || !Date.parse(manifest.preparedAt)) throw new Error("Review run needs an ID and prepared timestamp.");
  if (!Number.isInteger(manifest.instruction?.version) || !/^[0-9a-f]{64}$/i.test(manifest.instruction?.sha256 ?? "")) {
    throw new Error("Review run instruction metadata is invalid.");
  }
  if (!Date.parse(manifest.input?.collectedAt) || !/^[0-9a-f]{64}$/i.test(manifest.input?.sha256 ?? "")) {
    throw new Error("Review run input metadata is invalid.");
  }
  if (!Array.isArray(manifest.sources) || manifest.sources.some((source) => !source.repository)) {
    throw new Error("Review run source snapshot is invalid.");
  }
  if (!Array.isArray(manifest.availableFeedbackIds) || !Array.isArray(manifest.processedFeedbackIds)) {
    throw new Error("Review run feedback IDs must be arrays.");
  }
  const available = new Set(manifest.availableFeedbackIds);
  if (manifest.processedFeedbackIds.some((id) => typeof id !== "string" || !available.has(id))) {
    throw new Error("Processed feedback IDs must come from the prepared candidate input.");
  }
  if (!Array.isArray(manifest.humanEdits) || manifest.humanEdits.some((entry) => typeof entry !== "string" || !entry.trim())) {
    throw new Error("Human edits must be recorded as non-empty descriptions.");
  }
  if (!manifest.model || !manifest.runtime?.codex) {
    throw new Error("Record the Codex model and runtime version before finalizing the review run.");
  }
}

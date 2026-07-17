import { canonicalRepository } from "./repository-identity.ts";

export const MAX_REPOSITORY_INVENTORY_ENTRIES = 5_000;

export type RepositoryInventoryEntry = {
  archived: boolean;
  defaultBranch: string;
  fork: boolean;
  fullName: string;
  id: number;
  private: boolean;
  pushedAt: string | null;
  updatedAt: string;
};

export type RepositoryInventorySource = {
  archived: boolean;
  defaultBranch: string;
  fork: boolean;
  fullName: string;
  id: number;
  private: boolean;
  pushedAt: string | null;
  updatedAt: string;
};

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function repositoryInventoryFromLibrary(repositories: RepositoryInventorySource[]) {
  return parseRepositoryInventory(repositories);
}

export function parseRepositoryInventory(input: unknown): RepositoryInventoryEntry[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > MAX_REPOSITORY_INVENTORY_ENTRIES) {
    throw new Error("Invalid repository inventory.");
  }

  const byRepository = new Map<string, RepositoryInventoryEntry>();
  for (const [index, value] of input.entries()) {
    if (!isRecord(value)) throw new Error(`Invalid repository inventory entry ${index + 1}.`);
    const fullName = canonicalRepository(readString(value.fullName, 200, `repositoryInventory[${index}].fullName`));
    if (!REPOSITORY_PATTERN.test(fullName)) throw new Error(`Invalid repository inventory target ${fullName}.`);
    const entry: RepositoryInventoryEntry = {
      archived: readBoolean(value.archived, `repositoryInventory[${index}].archived`),
      defaultBranch: readRequiredString(value.defaultBranch, 255, `repositoryInventory[${index}].defaultBranch`),
      fork: readBoolean(value.fork, `repositoryInventory[${index}].fork`),
      fullName,
      id: readPositiveInteger(value.id, `repositoryInventory[${index}].id`),
      private: readBoolean(value.private, `repositoryInventory[${index}].private`),
      pushedAt: readTimestamp(value.pushedAt, true, `repositoryInventory[${index}].pushedAt`),
      updatedAt: readTimestamp(value.updatedAt, false, `repositoryInventory[${index}].updatedAt`),
    };
    const current = byRepository.get(fullName);
    if (!current || Date.parse(entry.updatedAt) >= Date.parse(current.updatedAt)) byRepository.set(fullName, entry);
  }

  return [...byRepository.values()].sort((left, right) => {
    const pushedDifference = timestampValue(right.pushedAt) - timestampValue(left.pushedAt);
    return pushedDifference || left.fullName.localeCompare(right.fullName);
  });
}

function readBoolean(value: unknown, field: string) {
  if (typeof value !== "boolean") throw new Error(`${field} must be a boolean.`);
  return value;
}

function readPositiveInteger(value: unknown, field: string) {
  if (!Number.isInteger(value) || Number(value) <= 0) throw new Error(`${field} must be a positive integer.`);
  return Number(value);
}

function readRequiredString(value: unknown, maximumLength: number, field: string) {
  const result = readString(value, maximumLength, field).trim();
  if (!result) throw new Error(`${field} must not be empty.`);
  return result;
}

function readString(value: unknown, maximumLength: number, field: string) {
  if (typeof value !== "string" || value.length > maximumLength) throw new Error(`${field} is invalid.`);
  return value;
}

function readTimestamp(value: unknown, nullable: true, field: string): string | null;
function readTimestamp(value: unknown, nullable: false, field: string): string;
function readTimestamp(value: unknown, nullable: boolean, field: string) {
  if (nullable && value === null) return null;
  const result = readRequiredString(value, 80, field);
  if (Number.isNaN(Date.parse(result))) throw new Error(`${field} must be an ISO timestamp.`);
  return result;
}

function timestampValue(value: string | null) {
  return value ? Date.parse(value) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

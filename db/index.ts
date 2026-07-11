export function getDb() {
  throw new Error(
    "Baxtori does not use an application database. Weekly editions are versioned in data/latest.json and data/editions/.",
  );
}

from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text()
old = '''  useEffect(() => {
    if (!hasHydrated || !repositoriesLoaded || repositoryModesInitialized) return;
    setRepositoryModes((current) => initializeRepositoryModes({
      legacySelectedRepositories: legacySelectedRepositories.current,
      repositories,
      source: repositoryPreferenceSource.current,
      storedModes: current,
    }));
    setRepositoryModesInitialized(true);
  }, [hasHydrated, repositories, repositoriesLoaded, repositoryModesInitialized]);

  useEffect(() => {
    if (!repositoryModesInitialized || !repositories.length) return;
    setRepositoryModes((current) => initializeRepositoryModes({
      legacySelectedRepositories: [],
      repositories,
      source: "explicit",
      storedModes: current,
    }));
  }, [repositories, repositoryModesInitialized]);
'''
new = '''  useEffect(() => {
    if (!hasHydrated || !repositoriesLoaded || repositoryModesInitialized) return;
    queueMicrotask(() => {
      setRepositoryModes((current) => initializeRepositoryModes({
        legacySelectedRepositories: legacySelectedRepositories.current,
        repositories,
        source: repositoryPreferenceSource.current,
        storedModes: current,
      }));
      setRepositoryModesInitialized(true);
    });
  }, [hasHydrated, repositories, repositoriesLoaded, repositoryModesInitialized]);

  useEffect(() => {
    if (!repositoryModesInitialized || !repositories.length) return;
    queueMicrotask(() => {
      setRepositoryModes((current) => initializeRepositoryModes({
        legacySelectedRepositories: [],
        repositories,
        source: "explicit",
        storedModes: current,
      }));
    });
  }, [repositories, repositoryModesInitialized]);
'''
if old not in text:
    raise SystemExit("Could not queue repository mode reconciliation")
path.write_text(text.replace(old, new, 1))

from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text()
old = '''  useEffect(() => {
    if (!hasHydrated || !accountStorageKey) return;
    const saved: SavedState = {
'''
new = '''  useEffect(() => {
    if (!hasHydrated || !accountStorageKey || !repositoryModesInitialized) return;
    const saved: SavedState = {
'''
if old not in text:
    raise SystemExit("Could not add repository mode persistence gate")
text = text.replace(old, new, 1)
old_dependencies = '''  }, [accountStorageKey, activeMapRepository, feedbackConfigured, hasHydrated, hideUnderstood, mapStates, questionStates, repositoryModes, selectedRepositories, states, view]);
'''
new_dependencies = '''  }, [accountStorageKey, activeMapRepository, feedbackConfigured, hasHydrated, hideUnderstood, mapStates, questionStates, repositoryModes, repositoryModesInitialized, selectedRepositories, states, view]);
'''
if old_dependencies not in text:
    raise SystemExit("Could not update repository mode persistence dependencies")
path.write_text(text.replace(old_dependencies, new_dependencies, 1))

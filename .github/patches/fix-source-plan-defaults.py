from pathlib import Path

path = Path("scripts/lib/authorized-source-plan.mjs")
text = path.read_text()
old = '''  configuredSources,
  inventoryAvailable = repositoryInventory.length > 0,
  repositoryActivity = [],
  repositoryInventory = [],'''
new = '''  configuredSources,
  repositoryActivity = [],
  repositoryInventory = [],
  inventoryAvailable = repositoryInventory.length > 0,'''
if text.count(old) != 1:
    raise SystemExit("Expected one source-plan parameter target.")
path.write_text(text.replace(old, new, 1))

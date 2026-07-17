from pathlib import Path


def replace_once(path: str, before: str, after: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(before)
    if count != 1:
        raise SystemExit(f"Expected one match in {path}, found {count}: {before[:80]!r}")
    file.write_text(text.replace(before, after, 1))


replace_once(
    "lib/feedback-contract.ts",
    'import { canonicalRepository, canonicalizeRepositoryList, canonicalizeRepositoryStateRecord } from "./repository-identity.ts";\n',
    'import { canonicalRepository, canonicalizeRepositoryList, canonicalizeRepositoryStateRecord } from "./repository-identity.ts";\nimport type { RepositoryMode } from "./repository-modes.ts";\n',
)
replace_once(
    "lib/feedback-contract.ts",
    '  questionStates: Record<string, "irrelevant" | "open" | "resolved">;\n  selectedRepositories: string[];\n',
    '  questionStates: Record<string, "irrelevant" | "open" | "resolved">;\n  repositoryModes: Record<string, RepositoryMode>;\n  selectedRepositories: string[];\n',
)
replace_once(
    "lib/feedback-contract.ts",
    'const QUESTION_STATES = new Set(["irrelevant", "open", "resolved"]);\nconst VIEWS = new Set(["briefing", "map", "repositories", "timeline"]);\n',
    'const QUESTION_STATES = new Set(["irrelevant", "open", "resolved"]);\nconst REPOSITORY_MODES = new Set(["automatic", "muted", "pinned"]);\nconst VIEWS = new Set(["briefing", "map", "repositories", "timeline"]);\n',
)
replace_once(
    "lib/feedback-contract.ts",
    '  const selectedRepositories = canonicalizeRepositoryList(readStringArray(input.selectedRepositories, MAX_REPOSITORY_STATE_ENTRIES, 200));\n  if (!selectedRepositories.every((repository) => REPOSITORY_PATTERN.test(repository))) throw new Error("Invalid selected repository.");\n',
    '  const repositoryModes = canonicalizeRepositoryStateRecord(parseEnumRecord<RepositoryMode>(input.repositoryModes ?? {}, REPOSITORY_MODES, MAX_REPOSITORY_STATE_ENTRIES));\n  if (!Object.keys(repositoryModes).every((repository) => REPOSITORY_PATTERN.test(repository))) throw new Error("Invalid repository mode target.");\n  const selectedRepositories = canonicalizeRepositoryList(readStringArray(input.selectedRepositories, MAX_REPOSITORY_STATE_ENTRIES, 200));\n  if (!selectedRepositories.every((repository) => REPOSITORY_PATTERN.test(repository))) throw new Error("Invalid selected repository.");\n',
)
replace_once(
    "lib/feedback-contract.ts",
    '    questionStates: canonicalizeRepositoryStateRecord(parseEnumRecord<ReaderStatePayload["questionStates"][string]>(input.questionStates, QUESTION_STATES)),\n    selectedRepositories,\n',
    '    questionStates: canonicalizeRepositoryStateRecord(parseEnumRecord<ReaderStatePayload["questionStates"][string]>(input.questionStates, QUESTION_STATES)),\n    repositoryModes,\n    selectedRepositories,\n',
)
replace_once(
    "lib/feedback-contract.ts",
    'function parseEnumRecord<T extends string>(input: unknown, allowed: Set<string>) {\n  return parseRecord(input, 500, (value) => {\n',
    'function parseEnumRecord<T extends string>(input: unknown, allowed: Set<string>, maximumEntries = 500) {\n  return parseRecord(input, maximumEntries, (value) => {\n',
)

replace_once(
    "app/page.tsx",
    'import { parseStoredQuestionRecords, type ThreadQuestionRecord } from "@/lib/story-questions";\nimport { activeWatchThreadFor, storyWatchInput, topicThreadFor, type TopicThreadRecord } from "@/lib/story-topics";\nimport type { ReaderStatePayload, ReaderStoryState, ReviewRequest } from "@/lib/feedback-contract";\nimport { RepositoryMaps } from "./repository-maps";\n',
    'import { parseStoredQuestionRecords, type ThreadQuestionRecord } from "@/lib/story-questions";\nimport {\n  initializeRepositoryModes,\n  repositoryModeCounts,\n  repositoryModeFor,\n  restorePublishedRepositoryModes,\n  reviewRepositoriesFromModes,\n  sortRepositoriesByMode,\n  withRepositoryMode,\n  REPOSITORY_MODE_DESCRIPTIONS,\n  REPOSITORY_MODE_LABELS,\n  type RepositoryMode,\n  type RepositoryPreferenceSource,\n} from "@/lib/repository-modes";\nimport { activeWatchThreadFor, storyWatchInput, topicThreadFor, type TopicThreadRecord } from "@/lib/story-topics";\nimport type { ReaderStatePayload, ReaderStoryState, ReviewRequest } from "@/lib/feedback-contract";\nimport { RepositoryModeControl } from "./repository-mode-control";\nimport repositoryModeStyles from "./repository-modes.module.css";\nimport { RepositoryMaps } from "./repository-maps";\n',
)
replace_once(
    "app/page.tsx",
    '  const [repositorySearch, setRepositorySearch] = useState("");\n  const [showAllRepositories, setShowAllRepositories] = useState(false);\n  const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);\n  const [activity, setActivity] = useState<Record<string, ActivityResponse>>({});\n',
    '  const [repositorySearch, setRepositorySearch] = useState("");\n  const [repositoryModeFilter, setRepositoryModeFilter] = useState<"all" | RepositoryMode>("all");\n  const [showAllRepositories, setShowAllRepositories] = useState(false);\n  const [repositoryModes, setRepositoryModes] = useState<Record<string, RepositoryMode>>({});\n  const [repositoryModesInitialized, setRepositoryModesInitialized] = useState(false);\n  const [repositoriesLoaded, setRepositoriesLoaded] = useState(false);\n  const legacySelectedRepositories = useRef<string[]>(SCHEDULED_REPOSITORIES);\n  const repositoryPreferenceSource = useRef<RepositoryPreferenceSource>("legacy");\n  const [activity, setActivity] = useState<Record<string, ActivityResponse>>({});\n',
)
replace_once(
    "app/page.tsx",
    '  const storyState = (id: string): StoryState => ({ ...EMPTY_STORY_STATE, ...states[id] });\n  const accountStorageKey = auth?.user ? `${STORAGE_KEY}:${auth.user.id}` : null;\n',
    '  const storyState = (id: string): StoryState => ({ ...EMPTY_STORY_STATE, ...states[id] });\n  const selectedRepositories = useMemo(() => reviewRepositoriesFromModes(repositoryModes), [repositoryModes]);\n  const accountStorageKey = auth?.user ? `${STORAGE_KEY}:${auth.user.id}` : null;\n',
)
replace_once(
    "app/page.tsx",
    '      const savedRepositories = parsed.selectedRepositories ?? parsed.selectedRepoIds;\n      if (Array.isArray(savedRepositories)) setSelectedRepositories(savedRepositories);\n',
    '      const savedRepositories = parsed.selectedRepositories ?? parsed.selectedRepoIds ?? SCHEDULED_REPOSITORIES;\n      legacySelectedRepositories.current = Array.isArray(savedRepositories) ? savedRepositories : SCHEDULED_REPOSITORIES;\n      if (parsed.repositoryModes && Object.keys(parsed.repositoryModes).length) {\n        setRepositoryModes(parsed.repositoryModes);\n        repositoryPreferenceSource.current = "explicit";\n      } else {\n        setRepositoryModes({});\n        repositoryPreferenceSource.current = "legacy";\n      }\n',
)
replace_once(
    "app/page.tsx",
    '      setView("briefing");\n      setSelectedRepositories(SCHEDULED_REPOSITORIES);\n      setReviewRequests([]);\n',
    '      setView("briefing");\n      setRepositoryModes({});\n      setRepositoryModesInitialized(false);\n      legacySelectedRepositories.current = SCHEDULED_REPOSITORIES;\n      repositoryPreferenceSource.current = "legacy";\n      setReviewRequests([]);\n',
)
replace_once(
    "app/page.tsx",
    '      questionStates,\n      selectedRepositories,\n      states,\n',
    '      questionStates,\n      repositoryModes,\n      selectedRepositories,\n      states,\n',
)
replace_once(
    "app/page.tsx",
    '  }, [accountStorageKey, activeMapRepository, feedbackConfigured, hasHydrated, hideUnderstood, mapStates, questionStates, selectedRepositories, states, view]);\n',
    '  }, [accountStorageKey, activeMapRepository, feedbackConfigured, hasHydrated, hideUnderstood, mapStates, questionStates, repositoryModes, selectedRepositories, states, view]);\n',
)
replace_once(
    "app/page.tsx",
    '    queueMicrotask(() => {\n      if (!cancelled) setRepositoryLoading(true);\n    });\n',
    '    queueMicrotask(() => {\n      if (!cancelled) {\n        setRepositoryLoading(true);\n        setRepositoriesLoaded(false);\n      }\n    });\n',
)
replace_once(
    "app/page.tsx",
    '      .finally(() => {\n        if (!cancelled) setRepositoryLoading(false);\n      });\n\n    return () => {\n',
    '      .finally(() => {\n        if (!cancelled) {\n          setRepositoryLoading(false);\n          setRepositoriesLoaded(true);\n        }\n      });\n\n    return () => {\n',
)
replace_once(
    "app/page.tsx",
    '  useEffect(() => {\n    if (!auth?.authenticated || !selectedRepositories.length) {\n',
    '  useEffect(() => {\n    if (!hasHydrated || !repositoriesLoaded || repositoryModesInitialized) return;\n    setRepositoryModes((current) => initializeRepositoryModes({\n      legacySelectedRepositories: legacySelectedRepositories.current,\n      repositories,\n      source: repositoryPreferenceSource.current,\n      storedModes: current,\n    }));\n    setRepositoryModesInitialized(true);\n  }, [hasHydrated, repositories, repositoriesLoaded, repositoryModesInitialized]);\n\n  useEffect(() => {\n    if (!repositoryModesInitialized || !repositories.length) return;\n    setRepositoryModes((current) => initializeRepositoryModes({\n      legacySelectedRepositories: [],\n      repositories,\n      source: "explicit",\n      storedModes: current,\n    }));\n  }, [repositories, repositoryModesInitialized]);\n\n  useEffect(() => {\n    if (!auth?.authenticated || !repositoryModesInitialized || !selectedRepositories.length) {\n',
)
replace_once(
    "app/page.tsx",
    '  }, [auth?.authenticated, selectedRepositories]);\n',
    '  }, [auth?.authenticated, repositoryModesInitialized, selectedRepositories]);\n',
)
replace_once(
    "app/page.tsx",
    '  const selectedRepositoryData = repositories.filter((repository) =>\n    selectedRepositories.includes(repository.fullName),\n  );\n',
    '  const selectedRepositoryData = sortRepositoriesByMode(repositories.filter((repository) =>\n    selectedRepositories.includes(repository.fullName),\n  ), repositoryModes);\n  const repositoryCounts = repositoryModeCounts(repositories, repositoryModes);\n',
)
replace_once(
    "app/page.tsx",
    '    return repositories.filter((repository) => {\n      if (!query) return true;\n      return repository.fullName.toLowerCase().includes(query) ||\n        repository.description?.toLowerCase().includes(query) ||\n        repository.language?.toLowerCase().includes(query);\n    });\n  }, [repositories, repositorySearch]);\n',
    '    return sortRepositoriesByMode(repositories.filter((repository) => {\n      const mode = repositoryModeFor(repositoryModes, repository.fullName, repository.archived ? "muted" : "automatic");\n      if (repositoryModeFilter !== "all" && mode !== repositoryModeFilter) return false;\n      if (!query) return true;\n      return repository.fullName.toLowerCase().includes(query) ||\n        repository.description?.toLowerCase().includes(query) ||\n        repository.language?.toLowerCase().includes(query);\n    }), repositoryModes);\n  }, [repositories, repositoryModeFilter, repositoryModes, repositorySearch]);\n',
)
replace_once(
    "app/page.tsx",
    '  const toggleRepository = (repository: string) => {\n    setSelectedRepositories((current) => {\n      if (current.includes(repository)) return current.filter((item) => item !== repository);\n      return [...current, repository];\n    });\n  };\n',
    '  const updateRepositoryMode = (repository: string, mode: RepositoryMode) => {\n    setRepositoryModes((current) => withRepositoryMode(current, repository, mode));\n    setNotice(`${repository} is now ${REPOSITORY_MODE_LABELS[mode].toLowerCase()}.`);\n  };\n\n  const restorePublishedScope = () => {\n    setRepositoryModes(restorePublishedRepositoryModes({\n      modes: repositoryModes,\n      publishedRepositories: SCHEDULED_REPOSITORIES,\n      repositories,\n    }));\n    setNotice("Repository modes restored to the published review scope.");\n  };\n',
)
replace_once(
    "app/page.tsx",
    '    setRepositories([]);\n    setThreadQuestions([]);\n',
    '    setRepositories([]);\n    setRepositoriesLoaded(false);\n    setRepositoryModes({});\n    setRepositoryModesInitialized(false);\n    setThreadQuestions([]);\n',
)
replace_once(
    "app/page.tsx",
    '                <span>{selectedRepositories.length} in review scope · no repository limit</span>\n',
    '                <div className={repositoryModeStyles.summary}>\n                  <span>{repositoryCounts.pinned} pinned</span>\n                  <span>{repositoryCounts.automatic} automatic</span>\n                  <span>{repositoryCounts.muted} muted</span>\n                </div>\n',
)
replace_once(
    "app/page.tsx",
    '                  <p>Recent commits from the repositories below.</p>\n',
    '                  <p>Pinned repositories are checked first. Automatic repositories join when their activity provides a useful reason. Muted repositories remain in your library without scheduled checks.</p>\n',
)
replace_once(
    "app/page.tsx",
    '                  <button onClick={() => setSelectedRepositories(SCHEDULED_REPOSITORIES)} type="button">Restore published scope</button>\n',
    '                  <button onClick={restorePublishedScope} type="button">Restore published scope</button>\n',
)
replace_once(
    "app/page.tsx",
    '                   const commitCount = repositoryActivity?.commits?.length ?? 0;\n                   return (\n',
    '                   const commitCount = repositoryActivity?.commits?.length ?? 0;\n                   const mode = repositoryModeFor(repositoryModes, repository.fullName);\n                   return (\n',
)
replace_once(
    "app/page.tsx",
    '                           {scope && <span>{scope.mapStatus === "mapped" ? "Mapped" : scope.mapStatus === "empty" ? "No code yet" : "Not mapped"}</span>}\n',
    '                           <span>{REPOSITORY_MODE_LABELS[mode]}</span>\n                           {scope && <span>{scope.mapStatus === "mapped" ? "Mapped" : scope.mapStatus === "empty" ? "No code yet" : "Not mapped"}</span>}\n',
)
replace_once(
    "app/page.tsx",
    '                       <div className="scope-row-actions">\n                         <a href={repository.url} rel="noreferrer" target="_blank">GitHub ↗</a>\n                         <button onClick={() => toggleRepository(repository.fullName)} type="button">Remove</button>\n                       </div>\n',
    '                       <div className={repositoryModeStyles.scopeActions}>\n                         <a href={repository.url} rel="noreferrer" target="_blank">GitHub ↗</a>\n                         <RepositoryModeControl mode={mode} onChange={(nextMode) => updateRepositoryMode(repository.fullName, nextMode)} repository={repository.fullName} />\n                       </div>\n',
)
replace_once(
    "app/page.tsx",
    '              <p className="scope-boundary">Selections sync to your account. New repositories stay pending until their review cache is configured.</p>\n',
    '              <p className="scope-boundary">Modes sync to your account. They influence the activity pass and priority, but a repository still needs configured source access before Baxtori can publish code claims.</p>\n',
)
replace_once(
    "app/page.tsx",
    '              <input\n                aria-label="Search repositories"\n                onChange={(event) => setRepositorySearch(event.target.value)}\n                placeholder="Search repositories"\n                type="search"\n                value={repositorySearch}\n              />\n',
    '              <div className={repositoryModeStyles.toolbarControls}>\n                <input\n                  aria-label="Search repositories"\n                  onChange={(event) => setRepositorySearch(event.target.value)}\n                  placeholder="Search repositories"\n                  type="search"\n                  value={repositorySearch}\n                />\n                <div className={repositoryModeStyles.filters} aria-label="Filter repositories by review mode">\n                  {(["all", "pinned", "automatic", "muted"] as const).map((filter) => (\n                    <button aria-pressed={repositoryModeFilter === filter} key={filter} onClick={() => setRepositoryModeFilter(filter)} type="button">\n                      {filter === "all" ? `All ${repositories.length}` : `${REPOSITORY_MODE_LABELS[filter]} ${repositoryCounts[filter]}`}\n                    </button>\n                  ))}\n                </div>\n              </div>\n',
)
replace_once(
    "app/page.tsx",
    '                 {displayedRepositories.map((repository) => {\n                   const selected = selectedRepositories.includes(repository.fullName);\n                   return (\n                     <article className={selected ? "repo-row is-selected" : "repo-row"} key={repository.id}>\n',
    '                 {displayedRepositories.map((repository) => {\n                   const mode = repositoryModeFor(repositoryModes, repository.fullName, repository.archived ? "muted" : "automatic");\n                   const rowClass = mode === "pinned" ? repositoryModeStyles.pinnedRow : mode === "muted" ? repositoryModeStyles.mutedRow : "";\n                   return (\n                     <article className={`repo-row ${rowClass}`} key={repository.id}>\n',
)
replace_once(
    "app/page.tsx",
    '                       <button aria-pressed={selected} onClick={() => toggleRepository(repository.fullName)} type="button">\n                         {selected ? "Included ✓" : "Include"}\n                       </button>\n',
    '                       <div>\n                         <RepositoryModeControl mode={mode} onChange={(nextMode) => updateRepositoryMode(repository.fullName, nextMode)} repository={repository.fullName} />\n                         <span className={repositoryModeStyles.modeNote}>{REPOSITORY_MODE_DESCRIPTIONS[mode]}</span>\n                       </div>\n',
)

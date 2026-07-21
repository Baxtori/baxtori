export type EditionStoryPreview<T> = {
  enabled: boolean;
  stories: T[];
};

/**
 * Returns the stories published in an edition. Preview fixtures are available
 * only through an explicit preview flag; an empty published edition stays empty.
 */
export function storiesForEdition<T>(publishedStories: T[], preview?: EditionStoryPreview<T>) {
  return preview?.enabled ? preview.stories : publishedStories;
}

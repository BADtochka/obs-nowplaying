export function shouldResetArtworkAccent(
  previous: readonly [string | null | undefined, 'custom' | 'artwork'] | undefined,
  next: readonly [string | null | undefined, 'custom' | 'artwork'],
) {
  return !previous || previous[0] !== next[0] || previous[1] !== next[1];
}

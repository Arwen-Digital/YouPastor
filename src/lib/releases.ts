import releases from '@/data/releases.json'

export const latestReleaseVersion = [...releases]
  .sort((a, b) => b.date.localeCompare(a.date))[0]?.version ?? __APP_VERSION__

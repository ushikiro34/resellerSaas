'use client'

export function useDashboardState(searchParams: URLSearchParams) {
  return {
    from: searchParams.get('from'),
    to: searchParams.get('to'),
    channel: searchParams.get('channel')?.split(',') ?? [],
    margin: searchParams.get('margin'),
  }
}
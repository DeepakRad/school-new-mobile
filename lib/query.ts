import type { UseQueryOptions } from '@tanstack/react-query';

export const defaultScreenQueryOptions = {
  staleTime: 1000 * 60,
  gcTime: 1000 * 60 * 30,
  refetchOnMount: false,
  refetchOnReconnect: true,
  refetchOnWindowFocus: false,
} satisfies Pick<
  UseQueryOptions,
  | 'staleTime'
  | 'gcTime'
  | 'refetchOnMount'
  | 'refetchOnReconnect'
  | 'refetchOnWindowFocus'
>;

export const profileQueryOptions = {
  ...defaultScreenQueryOptions,
  staleTime: 1000 * 60 * 5,
} satisfies typeof defaultScreenQueryOptions;

export const notificationsQueryOptions = {
  ...defaultScreenQueryOptions,
  staleTime: 1000 * 30,
} satisfies typeof defaultScreenQueryOptions;

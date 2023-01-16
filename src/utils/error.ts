export enum ErrorCode {
  NoError,
  Unknown,
  PermissionDenied,
  ForegroundLocationPermissionDenied,
  BackgroundLocationPermissionDenied,
  CannotStartBackgroundLocationUpdates,
  BackgroundTaskNotDefined,
  CannotStopBackgroundLocationUpdates,
}

export const errorMessage = new Map<ErrorCode, string>([
  [ErrorCode.NoError, 'no error'],
  [ErrorCode.Unknown, 'unknown error'],
  [ErrorCode.PermissionDenied, 'permission denied'],
  [
    ErrorCode.ForegroundLocationPermissionDenied,
    'foreground location permission denied',
  ],
  [
    ErrorCode.BackgroundLocationPermissionDenied,
    'background location permission denied',
  ],
  [
    ErrorCode.CannotStartBackgroundLocationUpdates,
    'cannot start background location updates',
  ],
  [ErrorCode.BackgroundTaskNotDefined, 'background task has not been defined'],
  [
    ErrorCode.CannotStopBackgroundLocationUpdates,
    'cannot stop background location updates',
  ],
])

export type SafePromise = Promise<ErrorCode>

export function logError(error: unknown, messagePrefix?: string) {
  if (error) {
    console.error(
      `${messagePrefix}${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

export enum ErrorCode {
  NoError,
  Unknown,
  PermissionDenied,
  ForegroundLocationPermissionDenied,
  BackgroundLocationPermissionDenied,
  CannotStartBackgroundLocationUpdates,
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
])

export type SafePromise = Promise<ErrorCode>

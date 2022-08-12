import { Buffer } from '@craftzdog/react-native-buffer'

/** Unique bytes marking beginning of a message */
export const STAMP = Buffer.from('mgdlnkczmr', 'ascii')

/** Values must be in a byte range */
export enum MessageType {
  SET_CIRCUMFERENCE = 1,
  SET_MAP_PREVIEW,
  /** Data (all floats): altitude, slope, heading, turnDistance, turnAngle */
  SET_GPS_STATISTICS,
  SET_WEATHER_DATA,
  SET_PROGRESS_DATA,
  /** Data: 1 - background state; 0 - foreground state (single byte data) */
  SET_MOBILE_APP_STATE,
}

export enum IncomingMessageType {
  REQUEST_SETTINGS = 1,
  UPDATE_SPEED,
  REQUEST_PROGRESS_DATA,
}

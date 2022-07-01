import { Buffer } from '@craftzdog/react-native-buffer'

/** Unique bytes marking beginning of a message */
export const STAMP = Buffer.from('mgdlnkczmr', 'ascii')

/** Values must be in a byte range */
export enum MessageType {
  SET_CIRCUMFERENCE = 1,
  SET_MAP_PREVIEW,
}

export enum IncomingMessageType {
  REQUEST_SETTINGS = 1,
  UPDATE_SPEED = 2,
}

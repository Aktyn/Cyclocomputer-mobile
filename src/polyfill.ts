if (typeof BigUint64Array === 'undefined') {
  global.BigUint64Array = Uint32Array as never
}
if (typeof BigInt64Array === 'undefined') {
  global.BigInt64Array = Int32Array as never
}

import type EventEmitter from 'events'
import { useEffect } from 'react'
import type { EmitterBlueprint, Module } from '../modules/Module'

type FirstArgument<T> = T extends (arg: infer U, ...args: unknown[]) => void
  ? U
  : never
type RestArguments<T> = T extends (arg: unknown, ...args: infer U) => void
  ? U
  : never

type EmitterFactory<
  T extends Array<EmitterBlueprint>,
  EventName extends string | symbol,
> = {
  [K in keyof T]: FirstArgument<T[K]> extends EventName
    ? {
        name: FirstArgument<T[K]>
        args: RestArguments<T[K]>
      }
    : never
}

type GetObjectFromArray<ArrayType> = ArrayType extends [infer T, ...infer Rest]
  ? T | GetObjectFromArray<Rest>
  : never

type GetArgs<T> = T extends {
  args: Array<unknown>
}
  ? T['args']
  : never

export function useModuleEvent<
  Blueprints extends Array<EmitterBlueprint>,
  EventName extends Parameters<Blueprints[number]>[0],
>(
  module: Module<Blueprints>,
  eventName: EventName,
  listener: (
    ...args: GetArgs<GetObjectFromArray<EmitterFactory<Blueprints, EventName>>>
  ) => void,
) {
  useEffect(() => {
    const handleEvent = listener

    ;(module.emitter as unknown as EventEmitter).on(eventName, handleEvent)
    return () => {
      ;(module.emitter as unknown as EventEmitter).off(eventName, handleEvent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName, module.emitter])
}

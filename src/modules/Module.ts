import EventEmitter from 'events'

export type EmitterBlueprint = (
  name: string | symbol,
  ...args: unknown[]
) => void

type FirstArgument<T> = T extends (arg: infer U, ...args: unknown[]) => void
  ? U
  : never
type RestArguments<T> = T extends (arg: unknown, ...args: infer U) => void
  ? U
  : never

type ListenerType<T> = (...data: RestArguments<T>) => void

type EmitterFactory<T extends Array<EmitterBlueprint>, Self> = {
  [K in keyof T]: {
    emit: (event: FirstArgument<T[K]>, ...data: RestArguments<T[K]>) => boolean

    on(event: FirstArgument<T[K]>, listener: ListenerType<T[K]>): Self
    once(event: FirstArgument<T[K]>, listener: ListenerType<T[K]>): Self
    addListener(event: FirstArgument<T[K]>, listener: ListenerType<T[K]>): Self
    prependListener(
      event: FirstArgument<T[K]>,
      listener: ListenerType<T[K]>,
    ): Self
    prependOnceListener(
      event: FirstArgument<T[K]>,
      listener: ListenerType<T[K]>,
    ): Self

    off(event: FirstArgument<T[K]>, listener: ListenerType<T[K]>): Self
    removeListener(
      event: FirstArgument<T[K]>,
      listener: ListenerType<T[K]>,
    ): Self
  }
}

type OverwrittenKeys = keyof EmitterFactory<[EmitterBlueprint], never>[number]

type UnionToIntersection<UnionTypes> = (
  UnionTypes extends unknown ? (k: UnionTypes) => void : never
) extends (k: infer I) => void
  ? I
  : never
type UnfoldArray<T> = T extends [infer _, ...infer Rest]
  ? T[0] | UnfoldArray<Rest>
  : never

interface TypeAggregation<EventNames extends string | symbol> {
  eventNames: () => EventNames[]
  removeAllListeners(eventName?: EventNames): this
  // eslint-disable-next-line @typescript-eslint/ban-types
  rawListeners(eventName: EventNames): Function[]
}

type TypeEventEmitter<T, EventNames extends string | symbol> = Omit<
  EventEmitter,
  OverwrittenKeys | keyof TypeAggregation<string>
> &
  TypeAggregation<EventNames> &
  T

export abstract class Module<Blueprints extends Array<EmitterBlueprint>> {
  public emitter = new EventEmitter() as unknown as TypeEventEmitter<
    UnionToIntersection<UnfoldArray<EmitterFactory<Blueprints, EventEmitter>>>,
    FirstArgument<Blueprints[number]>
  >

  /** Helper property for types inference */
  public __blueprint: Blueprints
}

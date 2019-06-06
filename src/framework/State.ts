export class FullState<TClientEntity> extends Map<number, TClientEntity> { }

export class DeltaState<TClientEntity> extends Map<number, Partial<TClientEntity> | null> { }

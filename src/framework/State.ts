export type FullState<TClientEntity> = Record<number, TClientEntity>;

export type DeltaState<TClientEntity> = Record<number, Partial<TClientEntity> | null>;

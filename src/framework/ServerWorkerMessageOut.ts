export const enum ServerWorkerMessageOutType {
    FullState,
    DeltaState,
    Command,
}

export type ServerWorkerMessageOut<TServerToClientCommand, TClientEntity> = {
    type: ServerWorkerMessageOutType.FullState;
    who: string;
    tick: number;
    state: Record<number, TClientEntity>;
} | {
    type: ServerWorkerMessageOutType.DeltaState;
    who: string;
    tick: number;
    state: Record<number, Partial<TClientEntity> | null>;
} | {
    type: ServerWorkerMessageOutType.Command;
    who?: string;
    command: TServerToClientCommand;
};

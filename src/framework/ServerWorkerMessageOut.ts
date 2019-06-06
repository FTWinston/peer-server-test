import { FullState, DeltaState } from './State';

export const enum ServerWorkerMessageOutType {
    FullState,
    DeltaState,
    Command,
}

export type ServerWorkerMessageOut<TServerToClientCommand, TClientEntity> = {
    type: ServerWorkerMessageOutType.FullState;
    who: string;
    tick: number;
    state: FullState<TClientEntity>;
} | {
    type: ServerWorkerMessageOutType.DeltaState;
    who: string;
    tick: number;
    state: DeltaState<TClientEntity>;
} | {
    type: ServerWorkerMessageOutType.Command;
    who?: string;
    command: TServerToClientCommand;
};

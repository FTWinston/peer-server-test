import { Delta } from './Delta';

export const enum ServerWorkerMessageOutType {
    FullState,
    DeltaState,
    Command,
}

export type ServerWorkerMessageOut<TServerToClientCommand, TClientState> = {
    type: ServerWorkerMessageOutType.FullState;
    who: string;
    time: number;
    state: TClientState;
} | {
    type: ServerWorkerMessageOutType.DeltaState;
    who: string;
    time: number;
    state: Delta<TClientState>;
} | {
    type: ServerWorkerMessageOutType.Command;
    who?: string;
    command: TServerToClientCommand;
};

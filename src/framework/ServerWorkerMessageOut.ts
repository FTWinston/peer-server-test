import { Delta } from './Delta';
import { ControlOperation } from './ServerToClientMessage';

export const enum ServerWorkerMessageOutType {
    Ready,
    FullState,
    DeltaState,
    Command,
    Disconnect,
    Control,
    Players,
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
} | {
    type: ServerWorkerMessageOutType.Ready;
} | {
    type: ServerWorkerMessageOutType.Disconnect;
    who?: string;
    message: string;
} | {
    type: ServerWorkerMessageOutType.Control;
    who?: string;
    operation: ControlOperation;
} | {
    type: ServerWorkerMessageOutType.Players;
    players: string[];
};
export const enum ServerWorkerMessageOutType {
    State,
    Command,
}

export type ServerWorkerMessageOut<TServerToClientCommand, TServerState> = {
    type: ServerWorkerMessageOutType.State;
    who: string;
    state: TServerState;
} | {
    type: ServerWorkerMessageOutType.Command;
    who?: string;
    command: TServerToClientCommand;
};

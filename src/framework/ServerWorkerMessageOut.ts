export const enum ServerWorkerMessageOutType {
    State,
    Command,
}

export type ServerWorkerMessageOut<TServerToClientCommand, TClientEntity> = {
    type: ServerWorkerMessageOutType.State;
    who: string;
    state: TClientEntity[];
} | {
    type: ServerWorkerMessageOutType.Command;
    who?: string;
    command: TServerToClientCommand;
};

export const enum ServerWorkerMessageInType {
    Join,
    Quit,
    Command,
}

export type ServerWorkerMessageIn<TClientToServerCommand> = {
    type: ServerWorkerMessageInType.Command;
    who: string;
    command: TClientToServerCommand;
} | {
    type: ServerWorkerMessageInType.Join;
    who: string;
} | {
    type: ServerWorkerMessageInType.Quit;
    who: string;
};

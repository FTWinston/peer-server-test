export const enum ServerWorkerMessageInType {
    Join,
    Quit,
    Acknowledge,
    Command,
}

export type ServerWorkerMessageIn<TClientToServerCommand> = {
    type: ServerWorkerMessageInType.Command;
    who: string;
    command: TClientToServerCommand;
} | {
    type: ServerWorkerMessageInType.Join;
    who: string;
    name: string;
} | {
    type: ServerWorkerMessageInType.Acknowledge;
    who: string;
    time: number;
} | {
    type: ServerWorkerMessageInType.Quit;
    who: string;
};

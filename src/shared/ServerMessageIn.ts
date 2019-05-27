export const enum ServerMessageInType {
    Join,
    Quit,
    Command,
}

export type ServerMessageIn = {
    type: ServerMessageInType.Command;
    who: string;
    command: any;
} | {
    type: ServerMessageInType.Join;
    who: string;
} | {
    type: ServerMessageInType.Quit;
    who: string;
};

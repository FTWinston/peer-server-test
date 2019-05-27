export const enum ServerMessageOutType {
    State,
    Command,
}

export type ServerMessageOut = {
    type: ServerMessageOutType.State;
    who: string;
    state: any;
} | {
    type: ServerMessageOutType.Command;
    who?: string;
    command: any;
};

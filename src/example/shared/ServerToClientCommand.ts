export type ServerToClientCommand =
    | ['explode', string]
    | ['spawn', string, number, number];

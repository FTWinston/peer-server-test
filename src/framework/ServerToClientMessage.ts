import { Patch } from 'immer';

export const commandMessageIdentifier = 'c';
export const fullStateMessageIdentifier = 's';
export const deltaStateMessageIdentifier = 'd';
export const errorMessageIdentifier = 'e';
export const controlMessageIdentifier = 'x';

export type ControlOperation = 'simulate';

export type ServerToClientMessage<TServerToClientCommand, TClientState> =
    | ['s', TClientState, number]
    | ['d', Patch[], number]
    | ['c', TServerToClientCommand]
    | ['e', string]
    | ['x', ControlOperation];

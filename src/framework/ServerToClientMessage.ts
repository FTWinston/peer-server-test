import { PatchOperation } from 'filter-mirror';

export const commandMessageIdentifier = 'c';
export const fullStateMessageIdentifier = 's';
export const deltaStateMessageIdentifier = 'd';
export const errorMessageIdentifier = 'e';
export const controlMessageIdentifier = 'x';

export type ControlOperation = 'simulate';

export type ServerToClientMessage<TServerToClientCommand> =
    | ['s', string, number]
    | ['d', PatchOperation[], number]
    | ['c', TServerToClientCommand]
    | ['e', string]
    | ['x', ControlOperation];

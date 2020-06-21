import { PatchOperation } from 'filter-mirror';

export const eventMessageIdentifier = 'c';
export const fullStateMessageIdentifier = 's';
export const deltaStateMessageIdentifier = 'd';
export const errorMessageIdentifier = 'e';
export const controlMessageIdentifier = 'x';

export type ControlOperation = 'simulate';

export interface IEvent {
    type: string;
}

export type SystemEvent = {
    type: 'join';
    client: string;
} | {
    type: 'quit';
    client: string;
};

export type ServerToClientMessage<TEvent extends IEvent> =
    | ['s', string, number]
    | ['d', PatchOperation[], number]
    | ['c', TEvent | SystemEvent]
    | ['e', string]
    | ['x', ControlOperation];

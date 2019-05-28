export const commandMessageIdentifier = 'c';
export const stateMessageIdentifier = 's';

export type ServerToClientMessage<TServerToClientCommand, TClientState> =
    ['s', TClientState] |
    ['c', TServerToClientCommand];
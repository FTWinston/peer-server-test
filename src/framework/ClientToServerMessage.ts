export const commandMessageIdentifier = 'c';
export const acknowledgeMessageIdentifier = 'a';

export type ClientToServerMessage<TClientToServerCommand> =
    ['a', number] |
    ['c', TClientToServerCommand];
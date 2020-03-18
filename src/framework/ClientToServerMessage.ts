export const joinMessageIdentifier = 'j';
export const commandMessageIdentifier = 'c';
export const acknowledgeMessageIdentifier = 'a';

export type ClientToServerMessage<TClientToServerCommand> =
    ['j'] |
    ['a', number] |
    ['c', TClientToServerCommand];
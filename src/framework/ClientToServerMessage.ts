export const commandMessageIdentifier = 'c';
export const acknowledgeMessageIdentifier = 'a';

export type ClientToServerMessage<TClientCommand> =
    | ['a', number]
    | ['c', TClientCommand];

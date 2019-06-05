import { FullState, DeltaState } from './State';

export const commandMessageIdentifier = 'c';
export const fullStateMessageIdentifier = 's';
export const deltaStateMessageIdentifier = 'd';

export type ServerToClientMessage<TServerToClientCommand, TClientEntity> =
    ['s', FullState<TClientEntity>] |
    ['d', DeltaState<TClientEntity>] |
    ['c', TServerToClientCommand];
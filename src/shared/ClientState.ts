import { IEntity } from '../framework/IEntity';

export interface GameRules extends IEntity {
    type: 'game',
    active: boolean,
}

export interface Player extends IEntity {
    type: 'player',
    name: string,
    x: number,
    y: number,
}

export type ClientEntity =
GameRules |
Player;
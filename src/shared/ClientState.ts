export interface GameRules {
    active: boolean,
}

export interface Player {
    type: 'player',
    name: string,
    x: number,
    y: number,
}

export type ClientState = {
    rules: GameRules;
} | Record<string, Player>
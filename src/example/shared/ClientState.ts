export interface GameRules {
    active: boolean,
}

export interface Player {
    x: number,
    y: number,
}

export type ClientState = {
    rules: GameRules;
    players: Record<string, Player>;
}
export interface ServerState {
    active: boolean;
    players: {
        name: string;
        x: number;
        y: number;
    }[];
}
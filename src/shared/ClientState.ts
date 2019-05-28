export interface ClientState {
    active: boolean;
    players: {
        name: string;
        x: number;
        y: number;
    }[];
}
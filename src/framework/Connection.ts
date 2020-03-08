import Peer from 'peerjs';
import { Delta, applyDelta } from './Delta';

export const peerOptions: Peer.PeerJSOption = {
    // key: 'lwjd5qra8257b9',
};

export interface ConnectionMetadata {
    name: string;
}

export interface ConnectionParameters<TServerToClientCommand, TClientState> {
    initialState: TClientState,
    receiveCommand: (cmd: TServerToClientCommand) => void,
    receiveState: (state: TClientState) => void,
    receiveError: (message: string) => void;
    playersChanged: (players: string[]) => void;
}

export abstract class Connection<TClientToServerCommand, TServerToClientCommand, TClientState> {
    constructor(
        params: ConnectionParameters<TServerToClientCommand, TClientState>
    ) {
        this.receiveCommand = params.receiveCommand;
        this.receiveState = params.receiveState;
        this.receiveError = params.receiveError;
        this._clientState = params.initialState;
    }
    
    protected readonly receiveCommand: (cmd: TServerToClientCommand) => void;
    protected readonly receiveState: (state: TClientState) => void;
    protected readonly receiveError: (message: string) => void;
    private readonly playersChanged: (players: string[]) => void;
    private _clientState: TClientState;
    
    get clientState(): Readonly<TClientState> {
        return this._clientState;
    }

    protected receiveFullState(newState: TClientState) {
        const prevState = this._clientState;
        this._clientState = newState;
        this.receiveState(prevState);
    }

    protected receiveDeltaState(delta: Delta<TClientState>) {
        const prevState = this._clientState;
        
        const newState = { ...prevState };
        applyDelta(newState, delta);
        
        this._clientState = newState;
        this.receiveState(prevState);
    }

    abstract sendCommand(command: TClientToServerCommand): void;

    abstract disconnect(): void;

    abstract get localId(): string;

    private _players: string[] = [];

    get playerList(): string[] {
        return this._players;
    }

    protected setPlayerList(players: string[]) {
        this.playersChanged(players);
        this._players = players;
    }
}
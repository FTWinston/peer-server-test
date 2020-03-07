import Peer from 'peerjs';
import { Delta, applyDelta } from './Delta';

export const peerOptions: Peer.PeerJSOption = {
    // key: 'lwjd5qra8257b9',
};

export interface ConnectionMetadata {
    name: string;
}

export abstract class Connection<TClientToServerCommand, TServerToClientCommand, TClientState> {
    constructor(
        initialState: TClientState,
        protected readonly receiveCommand: (cmd: TServerToClientCommand) => void,
        protected readonly receivedState: (state: TClientState) => void,
    ) {
        this._clientState = initialState;
    }
    
    private _clientState: TClientState;
    
    get clientState(): Readonly<TClientState> {
        return this._clientState;
    }

    protected receiveFullState(newState: TClientState) {
        const prevState = this._clientState;
        this._clientState = newState;
        this.receivedState(prevState);
    }

    protected receiveDeltaState(delta: Delta<TClientState>) {
        const prevState = this._clientState;
        
        const newState = { ...prevState };
        applyDelta(newState, delta);
        
        this._clientState = newState;
        this.receivedState(prevState);
    }

    abstract sendCommand(command: TClientToServerCommand): void;

    abstract disconnect(): void;

    abstract get localId(): string;
}
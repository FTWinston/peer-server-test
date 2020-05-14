import { enablePatches, applyPatches, Patch } from 'immer';

enablePatches();

export interface ConnectionMetadata {
    name: string;
}

export interface ConnectionParameters<TServerToClientCommand, TClientState extends {}, TLocalState extends {} = {}> {
    initialClientState: TClientState,
    initialLocalState?: TLocalState,
    receiveCommand: (cmd: TServerToClientCommand) => void,
    clientStateChanged?: (prevState: Readonly<TClientState>, newState: Readonly<TClientState>) => void;
    receiveError: (message: string) => void;
}

export abstract class ServerConnection<TClientToServerCommand, TServerToClientCommand, TClientState extends {}, TLocalState extends {} = {}> {
    constructor(
        params: ConnectionParameters<TServerToClientCommand, TClientState, TLocalState>
    ) {
        this.receiveCommand = params.receiveCommand;
        this.receiveError = params.receiveError;
        this.clientStateChanged = params.clientStateChanged;
        this._clientState = params.initialClientState;
    }
    
    protected readonly receiveCommand: (cmd: TServerToClientCommand) => void;
    protected readonly receiveError: (message: string) => void;
    private readonly clientStateChanged?: (prevState: TClientState, newState: TClientState) => void;
    private _clientState: TClientState;
    
    get clientState(): Readonly<TClientState> {
        return this._clientState;
    }
    
    public localState: TLocalState;

    protected receiveFullState(newState: TClientState) {
        const prevState = this._clientState;
        this._clientState = newState;
        if (prevState !== newState && this.clientStateChanged) {
            this.clientStateChanged(prevState, newState);
        }
    }

    protected receiveDeltaState(delta: Patch[]) {
        if (!delta) {
            return;
        }

        const prevState = this._clientState;
        const newState = applyPatches(prevState, delta);

        if (newState !== prevState && this.clientStateChanged) {
            this._clientState = newState;
            this.clientStateChanged(prevState, newState);
        }
    }

    abstract sendCommand(command: TClientToServerCommand): void;

    abstract disconnect(): void;

    abstract get localId(): string;
}
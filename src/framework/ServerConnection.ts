import { Delta, applyDelta } from './Delta';

export interface ConnectionMetadata {
    name: string;
}

export interface ConnectionParameters<TServerToClientCommand, TClientState extends {}, TLocalState extends {} = {}> {
    initialClientState: TClientState,
    initialLocalState?: TClientState,
    receiveCommand: (cmd: TServerToClientCommand) => Delta<TLocalState> | void | undefined,
    clientStateChanged?: (state: Readonly<TClientState>, update: Delta<TClientState>) => void;
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
    
    protected readonly receiveCommand: (cmd: TServerToClientCommand) => Delta<TLocalState> | void | undefined;
    protected readonly receiveError: (message: string) => void;
    private readonly clientStateChanged?: (state: TClientState, update: Delta<TClientState>) => void;
    private _clientState: TClientState;
    
    get clientState(): Readonly<TClientState> {
        return this._clientState;
    }
    
    public localState: TLocalState;

    protected receiveFullState(newState: TClientState) {
        const prevState = this._clientState;
        this._clientState = newState;
        this.clientStateChanged(prevState, newState);
    }

    protected receiveDeltaState(delta: Delta<TClientState>) {
        if (!delta) {
            return;
        }

        const prevState = this._clientState;
        const newState = { ...prevState };
        applyDelta(newState, delta);
        this._clientState = newState;
        this.clientStateChanged(prevState, delta);
    }

    abstract sendCommand(command: TClientToServerCommand): void;

    abstract disconnect(): void;

    abstract get localId(): string;
}
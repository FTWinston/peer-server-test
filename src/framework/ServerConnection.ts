import { Delta, applyDelta } from './Delta';

export interface ConnectionMetadata {
    name: string;
}

export interface ConnectionParameters<TServerToClientCommand, TClientState> {
    initialState: TClientState,
    receiveCommand: (cmd: TServerToClientCommand) => Delta<TClientState> | void | undefined,
    stateChanged?: (state: Readonly<TClientState>, update: Delta<TClientState>) => void;
    receiveError: (message: string) => void;
    playersChanged: (players: string[]) => void;
}

export abstract class ServerConnection<TClientToServerCommand, TServerToClientCommand, TClientState> {
    constructor(
        params: ConnectionParameters<TServerToClientCommand, TClientState>
    ) {
        this.receiveCommand = params.receiveCommand;
        this.receiveError = params.receiveError;
        this.playersChanged = params.playersChanged;
        this.stateChanged = params.stateChanged;
        this._clientState = params.initialState;
    }
    
    protected readonly receiveCommand: (cmd: TServerToClientCommand) => Delta<TClientState> | void | undefined;
    protected readonly receiveError: (message: string) => void;
    private readonly playersChanged: (players: string[]) => void;
    private readonly stateChanged?: (state: TClientState, update: Delta<TClientState>) => void;
    private _clientState: TClientState;
    
    get clientState(): Readonly<TClientState> {
        return this._clientState;
    }

    protected receiveFullState(newState: TClientState) {
        const prevState = this._clientState;
        this._clientState = newState;
        this.stateChanged(prevState, newState);
    }

    protected receiveDeltaState(delta: Delta<TClientState>) {
        this.updateState(delta);
    }

    public updateState(delta: Delta<TClientState> | void | undefined) {
        if (!delta) {
            return;
        }

        const prevState = this._clientState;
        const newState = { ...prevState };
        applyDelta(newState, delta);
        this._clientState = newState;
        this.stateChanged(prevState, delta);
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
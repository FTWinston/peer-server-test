import { ServerWorkerMessageOut } from './ServerWorkerMessageOut';
import { Server } from './Server';
import produce, { Draft } from 'immer';
import { ClientStateManager } from './ClientStateManager';

export abstract class StatefulServer<TServerState extends {}, TClientState extends {}, TClientToServerCommand, TServerToClientCommand> 
    extends Server<TServerState, TClientState, TClientToServerCommand, TServerToClientCommand>
{
    private readonly _clients = new Map<string, ClientStateManager<TServerState, TClientState, TServerToClientCommand>>();

    private _state: TServerState;

    constructor(
        initialState: TServerState,
        protected readonly sendMessage: (message: ServerWorkerMessageOut<TServerToClientCommand, TClientState>) => void
    ) {
        super(sendMessage);
        this._state = initialState;
    }

    public get clients() { return this._clients.keys(); }

    protected get state(): Readonly<TServerState> { return this._state; }

    protected isNameInUse(name: string) {
        return this._clients.has(name);
    }

    protected addClient(client: string) {
        this._clients.set(
            client,
            new ClientStateManager<TServerState, TClientState, TServerToClientCommand>(
                client,
                this.sendMessage,
                this.updateClientState,
            )
        );

        const time = Math.round(performance.now());
        this._clients.get(client)?.sendState(time, this._state);
    }

    protected removeClient(name: string) {
        return this._clients.delete(name);
    }

    protected updateState(update: (state: Draft<TServerState>) => void) {
        const nextState = produce(this._state, update);

        const time = Math.round(performance.now());
        
        for (const [_, stateManager] of this._clients) {
            stateManager.sendState(time, nextState);
        }

        this._state = nextState;
    }
}
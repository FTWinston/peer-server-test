import { ServerWorkerMessageOut } from './ServerWorkerMessageOut';
import { Server } from './Server';
import { ClientStateManager } from './ClientStateManager';

export abstract class StatefulServer<
    TServerState extends {},
    TClientState extends {},
    TClientToServerCommand,
    TServerToClientCommand
> extends Server<
    TServerState,
    TClientState,
    TClientToServerCommand,
    TServerToClientCommand
> {
    private readonly _clients = new Map<
        string,
        ClientStateManager<TClientState, TServerToClientCommand>
    >();

    constructor(
        initialState: TServerState,
        protected readonly sendMessage: (
            message: ServerWorkerMessageOut<
                TServerToClientCommand,
                TClientState
            >
        ) => void
    ) {
        super(initialState, sendMessage);
    }

    public get clients() {
        return this._clients.keys();
    }

    protected isNameInUse(name: string) {
        return this._clients.has(name);
    }

    protected addClient(
        client: string,
        state: TClientState,
        substituteState: (newState: TClientState) => void
    ) {
        this._clients.set(
            client,
            new ClientStateManager<TClientState, TServerToClientCommand>(
                client,
                state,
                this.sendMessage,
                substituteState
            )
        );

        const time = Math.round(performance.now());
        this._clients.get(client)?.sendState(time);
    }

    protected removeClient(name: string) {
        return this._clients.delete(name);
    }

    protected updateState(update: (state: TServerState) => void) {
        super.updateState(update);

        const time = Math.round(performance.now());

        for (const [_, stateManager] of this._clients) {
            stateManager.sendState(time);
        }
    }
}

import { ServerWorkerMessageOut } from './ServerWorkerMessageOut';
import { Server } from './Server';
import { ClientStateManager } from './ClientStateManager';
import { PatchOperation } from 'filter-mirror';

export abstract class StatefulServer<
    TServerState extends {},
    TClientState extends {},
    TClientCommand,
    TServerEvent
> extends Server<
    TServerState,
    TClientState,
    TClientCommand,
    TServerEvent,
    ClientStateManager<TClientState, TServerEvent>
> {
    constructor(
        initialState: TServerState,
        protected readonly sendMessage: (
            message: ServerWorkerMessageOut<TServerEvent>
        ) => void
    ) {
        super(initialState, sendMessage);
    }

    protected createClient(
        client: string,
        createState: (
            patchCallback: (patch: PatchOperation) => void
        ) => TClientState
    ) {
        const clientManager = new ClientStateManager<
            TClientState,
            TServerEvent
        >(client, createState, this.sendMessage);

        const time = Math.round(performance.now());
        clientManager.sendState(time);

        return clientManager;
    }

    protected updateState(update: (state: TServerState) => void) {
        super.updateState(update);

        const time = Math.round(performance.now());

        for (const [_, stateManager] of this.clients) {
            stateManager.sendState(time);
        }
    }
}

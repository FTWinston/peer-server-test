import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import { Delta } from './Delta';
import { Server } from './Server';

export abstract class StatefulServer<TServerState extends {}, TClientState extends {}, TClientToServerCommand, TServerToClientCommand> 
    extends Server<TServerState, TClientState, TClientToServerCommand, TServerToClientCommand>
{
    private readonly _clients = new Set<string>();

    constructor(
        initialState: TServerState,
        protected readonly sendMessage: (message: ServerWorkerMessageOut<TServerToClientCommand, TClientState>) => void
    ) {
        super(initialState, sendMessage);
    }

    protected isNameInUse(name: string) {
        return this._clients.has(name);
    }

    protected addClient(name: string) {
        this._clients.add(name);
    }

    protected removeClient(name: string) {
        return this._clients.delete(name);
    }

    protected stateChanged(delta: Delta<TServerState>) {
        for (const client of this._clients) {
            this.sendMessage({
                type: ServerWorkerMessageOutType.DeltaState,
                who: client,
                time: 0,
                state: this.getDeltaStateToSendClient(client, delta, this.state),
            });
        }
    }
}
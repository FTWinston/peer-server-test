import { ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { commandMessageIdentifier, deltaStateMessageIdentifier, fullStateMessageIdentifier, errorMessageIdentifier, controlMessageIdentifier, ControlOperation, playersMessageIdentifier, ServerToClientMessage } from './ServerToClientMessage';
import { Delta } from './Delta';
import { OfflineServerConnection as OfflineServerConnection, OfflineConnectionParameters } from './OfflineServerConnection';
import { ConnectionManager } from './ConnectionManager';
import { IClient } from './IClient';

export interface LocalConnectionParameters<TServerToClientCommand, TClientState>
    extends OfflineConnectionParameters<TServerToClientCommand, TClientState>
{
    signalUrl: string;
    clientName: string;
}

export class LocalServerConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
    extends OfflineServerConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
    implements IClient<TServerToClientCommand, TClientState> {
    private clients: ConnectionManager<TClientToServerCommand, TServerToClientCommand, TClientState>;
    readonly name: string;

    constructor(
        params: LocalConnectionParameters<TServerToClientCommand, TClientState>,
        ready: () => void,
    ) {
        super(params, () => {
            if (params.clientName.length < 1) {
                console.log('Local player has no name, aborting');
                params.worker.terminate();
                return;
            }

            this.clients = new ConnectionManager(
                params.signalUrl,
                message => this.sendMessageToServer(message),
                sessionID => {
                    // TODO: use the session ID somwhere. Pass it in to the server?
                    this.sendMessageToServer({
                        type: ServerWorkerMessageInType.Join,
                        who: params.clientName,
                    });

                    ready();
                },
                this
            );
        });

        this.name = params.clientName;
    }

    protected onServerReady() {
        // Don't send a join message right away. This will instead be sent once the peer is initialized.
    }

    send(message: ServerToClientMessage<TServerToClientCommand, TClientState>): void {
        // TODO: can we avoid having this AND separate dispatch operations?

        if (message[0] === 's') {
            super.dispatchFullStateFromServer(this.name, message[1], message[2]);
        }
        else if (message[0] === 'd') {
            super.dispatchDeltaStateFromServer(this.name, message[1], message[2]);
        }
        else if (message[0] === 'c') {
            super.dispatchCommandFromServer(this.name, message[1]);
        }
        else if (message[0] === 'e') {
            super.dispatchError(this.name, message[1]);
        }
        else if (message[0] === 'x') {
            // control operation ... doesn't apply to local client?
        }
        else if (message[0] === 'p') {
            super.dispatchPlayerList(message[1]);
        }
    }

    protected dispatchCommandFromServer(client: string | undefined, command: TServerToClientCommand) {
        this.clients.sendToClient(client, [commandMessageIdentifier, command])
    }

    protected dispatchFullStateFromServer(client: string, state: TClientState, time: number) {
        this.clients.sendToClient(client, [fullStateMessageIdentifier, state, time])
    }

    protected dispatchDeltaStateFromServer(client: string, state: Delta<TClientState>, time: number) {
        this.clients.sendToClient(client, [deltaStateMessageIdentifier, state, time])
    }

    protected dispatchError(client: string | undefined, message: string) {
        this.clients.sendToClient(client, [errorMessageIdentifier, message])
        this.clients.disconnect(client);
    }

    protected dispatchControl(client: string | undefined, operation: ControlOperation) {
        this.clients.sendToClient(client, [controlMessageIdentifier, operation]);
    }

    protected dispatchPlayerList(players: string[]) {
        this.clients.sendToClient(undefined, [playersMessageIdentifier, players])
    }

    disconnect() {
        // TODO: possible infinite loop here
        super.disconnect();
        this.clients.disconnect(undefined);
    }

    get localId() {
        return this.name;
    }
}
import { ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { commandMessageIdentifier, deltaStateMessageIdentifier, fullStateMessageIdentifier, errorMessageIdentifier, controlMessageIdentifier, ControlOperation, playersMessageIdentifier } from './ServerToClientMessage';
import { Delta } from './Delta';
import { OfflineConnection, OfflineConnectionParameters } from './OfflineConnection';
import { ServerPeer } from './ServerPeer';

export interface LocalConnectionParameters<TServerToClientCommand, TClientState>
    extends OfflineConnectionParameters<TServerToClientCommand, TClientState>
{
    initialState: TClientState;
    clientName: string;
}

export class LocalConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
    extends OfflineConnection<TClientToServerCommand, TServerToClientCommand, TClientState> {
    private peer: ServerPeer<TClientToServerCommand, TServerToClientCommand, TClientState>;

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

            this.peer = new ServerPeer(
                message => this.sendMessageToServer(message),
                () => {
                    this.sendMessageToServer({
                        type: ServerWorkerMessageInType.Join,
                        who: this.localId,
                        name: params.clientName,
                    });

                    ready();
                }
            );
        });
    }

    protected onServerReady() {
        // Don't send a join message right away. This will instead be sent once the peer is initialized.
    }

    protected dispatchCommandFromServer(client: string | undefined, command: TServerToClientCommand) {
        if (client !== this.peer.id) {
            this.peer.sendToClient(client, [commandMessageIdentifier, command])
        }

        if (client === undefined || client === this.peer.id) {
            super.dispatchCommandFromServer(client, command);
        }
    }

    protected dispatchFullStateFromServer(client: string, state: TClientState, time: number) {
        if (client !== this.peer.id) {
            this.peer.sendToClient(client, [fullStateMessageIdentifier, state, time])
        }

        if (client === undefined || client === this.peer.id) {
            super.dispatchFullStateFromServer(client, state, time);
        }
    }

    protected dispatchDeltaStateFromServer(client: string, state: Delta<TClientState>, time: number) {
        if (client !== this.peer.id) {
            this.peer.sendToClient(client, [deltaStateMessageIdentifier, state, time])
        }
        
        if (client === undefined || client === this.peer.id) {
            super.dispatchDeltaStateFromServer(client, state, time);
        }
    }

    protected dispatchError(client: string | undefined, message: string) {
        if (client !== this.peer.id) {
            this.peer.sendToClient(client, [errorMessageIdentifier, message])
            this.peer.disconnect(client);
        }
        
        if (client === undefined || client === this.peer.id) {
            super.dispatchError(client, message);
        }
    }

    protected dispatchControl(client: string | undefined, operation: ControlOperation) {
        if (client !== this.peer.id) {
            this.peer.sendToClient(client, [controlMessageIdentifier, operation])
        }
    }

    protected dispatchPlayerList(players: string[]) {
        super.dispatchPlayerList(players);
        this.peer.sendToClient(undefined, [playersMessageIdentifier, players])
    }

    disconnect() {
        super.disconnect();
        this.peer.disconnect(undefined);
    }

    get localId() {
        return this.peer.id;
    }
}
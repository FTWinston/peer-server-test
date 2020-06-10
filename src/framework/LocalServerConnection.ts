import { ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import {
    commandMessageIdentifier,
    deltaStateMessageIdentifier,
    fullStateMessageIdentifier,
    errorMessageIdentifier,
    controlMessageIdentifier,
    ControlOperation,
    ServerToClientMessage,
} from './ServerToClientMessage';
import {
    OfflineServerConnection,
    OfflineConnectionParameters,
} from './OfflineServerConnection';
import { ConnectionManager } from './ConnectionManager';
import { IClientConnection } from './IClientConnection';
import { IConnectionSettings } from './SignalConnection';
import { PatchOperation } from 'filter-mirror';

export interface LocalConnectionParameters<
    TServerToClientCommand,
    TClientState extends {},
    TLocalState extends {}
>
    extends OfflineConnectionParameters<
        TServerToClientCommand,
        TClientState,
        TLocalState
    > {
    signalSettings: IConnectionSettings;
    clientName: string;
    ready: () => void;
}

export class LocalServerConnection<
    TClientToServerCommand,
    TServerToClientCommand,
    TClientState extends {},
    TLocalState extends {} = {}
>
    extends OfflineServerConnection<
        TClientToServerCommand,
        TServerToClientCommand,
        TClientState,
        TLocalState
    >
    implements IClientConnection<TServerToClientCommand> {
    private clients: ConnectionManager<
        TClientToServerCommand,
        TServerToClientCommand,
        TClientState
    >;
    readonly clientName: string;

    constructor(
        params: LocalConnectionParameters<
            TServerToClientCommand,
            TClientState,
            TLocalState
        >
    ) {
        super(params, () => {
            if (params.clientName.length < 1) {
                console.log('Local player has no name, aborting');
                params.worker.terminate();
                return;
            }

            this.clients = new ConnectionManager(
                (message) => this.sendMessageToServer(message),
                (sessionID) => {
                    console.log(`Session ID is ${sessionID}`); // TODO: expose the session ID somewhere!

                    this.sendMessageToServer({
                        type: ServerWorkerMessageInType.Join,
                        who: params.clientName,
                    });

                    params.ready();
                },
                params.signalSettings,
                this
            );
        });

        this.clientName = params.clientName;
    }

    protected onServerReady() {
        // Don't send a join message right away. This will instead be sent once the peer is initialized.
    }

    send(message: ServerToClientMessage<TServerToClientCommand>): void {
        // TODO: can we avoid having this AND separate dispatch operations?

        if (message[0] === 's') {
            super.dispatchFullStateFromServer(
                this.clientName,
                message[1],
                message[2]
            );
        } else if (message[0] === 'd') {
            super.dispatchDeltaStateFromServer(
                this.clientName,
                message[1],
                message[2]
            );
        } else if (message[0] === 'c') {
            super.dispatchCommandFromServer(this.clientName, message[1]);
        } else if (message[0] === 'e') {
            super.dispatchError(this.clientName, message[1]);
        } else if (message[0] === 'x') {
            // control operation ... doesn't apply to local client?
        }
    }

    protected dispatchCommandFromServer(
        client: string | undefined,
        command: TServerToClientCommand
    ) {
        this.clients.sendToClient(client, [commandMessageIdentifier, command]);
    }

    protected dispatchFullStateFromServer(
        client: string,
        state: string,
        time: number
    ) {
        this.clients.sendToClient(client, [
            fullStateMessageIdentifier,
            state,
            time,
        ]);
    }

    protected dispatchDeltaStateFromServer(
        client: string,
        state: PatchOperation[],
        time: number
    ) {
        this.clients.sendToClient(client, [
            deltaStateMessageIdentifier,
            state,
            time,
        ]);
    }

    protected dispatchError(client: string | undefined, message: string) {
        this.clients.sendToClient(client, [errorMessageIdentifier, message]);
        this.clients.disconnect(client);
    }

    protected dispatchControl(
        client: string | undefined,
        operation: ControlOperation
    ) {
        this.clients.sendToClient(client, [
            controlMessageIdentifier,
            operation,
        ]);
    }

    disconnect() {
        // TODO: possible infinite loop here
        super.disconnect();
        this.clients.disconnect(undefined);
    }

    get localId() {
        return this.clientName;
    }
}

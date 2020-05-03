import { OfflineConnectionParameters } from './OfflineServerConnection';
import { ServerToClientMessage } from './ServerToClientMessage';
import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { ServerSignalConnection } from './ServerSignalConnection';
import { IClientConnection } from './IClientConnection';
import { RemoteClientConnection } from './RemoteClientConnection';
import { ISignalSettings } from './SignalConnection';

export interface ServerPeerParameters<TServerToClientCommand, TClientState>
    extends OfflineConnectionParameters<TServerToClientCommand, TClientState>
{
    initialState: TClientState;
    clientName: string;
}

export class ConnectionManager<TClientToServerCommand, TServerToClientCommand, TClientState> {
    private signal: ServerSignalConnection;
    private readonly clients = new Map<string, IClientConnection<TServerToClientCommand, TClientState>>();

    constructor(
        private readonly sendToServer: (message: ServerWorkerMessageIn<TClientToServerCommand>) => void,
        ready: (sessionID: string) => void,
        signalSettings: ISignalSettings,
        localClient?: IClientConnection<TServerToClientCommand, TClientState>,
    ) {
        this.signal = new ServerSignalConnection(
            signalSettings,
            ready,
            name => this.isNameAllowed(name),
            (name, peer) => this.remoteClientJoining(name, peer),
            () => this.signalDisconnected()
        );

        if (localClient) {
            this.clients.set(localClient.clientName, localClient);
        }
    }

    private signalDisconnected() {

    }

    private isNameAllowed(name: string) {
        if (this.clients.has(name)) {
            return false;
        }

        if (name.length === 0) {
            return false;
        }

        if (name.length > 20) {
            return false;
        }

        return true;
    }

    private remoteClientJoining(name: string, peer: RTCPeerConnection) {
        const client: RemoteClientConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
         = new RemoteClientConnection<TClientToServerCommand, TServerToClientCommand, TClientState>(
            name,
            peer,
            () => this.clientConnected(client),
            () => this.clientDisconnected(client),
            time => this.clientAcknowledged(client, time),
            command => this.clientCommand(client, command),
        );

        this.clients.set(name, client);
    }

    // This doesn't apply to local client, that's handled in LocalServerConnection
    private clientConnected(client: IClientConnection<TServerToClientCommand, TClientState>) {
        this.sendToServer({
            type: ServerWorkerMessageInType.Join,
            who: client.clientName,
        });
    }

    // This doesn't apply to local client, that's handled in LocalServerConnection
    private clientDisconnected(client: IClientConnection<TServerToClientCommand, TClientState>) {
        this.sendToServer({
            type: ServerWorkerMessageInType.Quit,
            who: client.clientName,
        });

        this.clients.delete(client.clientName);
    }

    // This doesn't apply to local client, that's handled in LocalServerConnection
    private clientAcknowledged(client: IClientConnection<TServerToClientCommand, TClientState>, time: number) {
        this.sendToServer({
            type: ServerWorkerMessageInType.Acknowledge,
            who: client.clientName,
            time,
        });
    }

    // This doesn't apply to local client, that's handled in LocalServerConnection
    private clientCommand(client: IClientConnection<TServerToClientCommand, TClientState>, command: TClientToServerCommand) {
        this.sendToServer({
            type: ServerWorkerMessageInType.Command,
            who: client.clientName,
            command,
        });
    }

    public sendToClient(client: string | undefined, message: ServerToClientMessage<TServerToClientCommand, TClientState>) {
        if (client === undefined) {
            for (const conn of this.clients.values()) {
                conn.send(message);
            }
        }
        else {
            this.clients.get(client)
                ?.send(message);
        }
    }

    public disconnect(client?: string) {
        if (client === undefined) {
            for (const conn of this.clients.values()) {
                conn.disconnect();
            }

            this.signal.disconnect();
        }
        else {
            this.clients.get(client)
                ?.disconnect();
        }
    }

    public disconnectSignal() {
        this.signal.disconnect();
    }
}
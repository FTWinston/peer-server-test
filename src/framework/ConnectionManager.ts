import { Instance } from 'simple-peer';
import { OfflineConnectionParameters } from './OfflineServerConnection';
import { ServerToClientMessage } from './ServerToClientMessage';
import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { SignalConnection } from './SignalConnection';
import { IClient } from './IClient';
import { RemoteClient } from './RemoteClient';

export interface ServerPeerParameters<TServerToClientCommand, TClientState>
    extends OfflineConnectionParameters<TServerToClientCommand, TClientState>
{
    initialState: TClientState;
    clientName: string;
}

export class ConnectionManager<TClientToServerCommand, TServerToClientCommand, TClientState> {
    private signal: SignalConnection;
    private readonly clients = new Map<string, IClient<TServerToClientCommand, TClientState>>();

    constructor(
        signalUrl: string,
        private readonly sendToServer: (message: ServerWorkerMessageIn<TClientToServerCommand>) => void,
        ready: (sessionID: string) => void,
        localClient?: IClient<TServerToClientCommand, TClientState>,
    ) {
        this.signal = new SignalConnection(
            signalUrl,
            ready,
            name => this.isNameAllowed(name),
            (name, peer) => this.remoteClientJoining(name, peer),
            () => this.signalDisconnected()
        );

        if (localClient) {
            this.clients.set(localClient.name, localClient);
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

    private remoteClientJoining(name: string, peer: Instance) {
        const client: RemoteClient<TClientToServerCommand, TServerToClientCommand, TClientState>
         = new RemoteClient<TClientToServerCommand, TServerToClientCommand, TClientState>(
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
    private clientConnected(client: IClient<TServerToClientCommand, TClientState>) {
        this.sendToServer({
            type: ServerWorkerMessageInType.Join,
            who: client.name,
        });
    }

    // This doesn't apply to local client, that's handled in LocalServerConnection
    private clientDisconnected(client: IClient<TServerToClientCommand, TClientState>) {
        this.sendToServer({
            type: ServerWorkerMessageInType.Quit,
            who: client.name,
        });

        this.clients.delete(client.name);
    }

    // This doesn't apply to local client, that's handled in LocalServerConnection
    private clientAcknowledged(client: IClient<TServerToClientCommand, TClientState>, time: number) {
        this.sendToServer({
            type: ServerWorkerMessageInType.Acknowledge,
            who: client.name,
            time,
        });
    }

    // This doesn't apply to local client, that's handled in LocalServerConnection
    private clientCommand(client: IClient<TServerToClientCommand, TClientState>, command: TClientToServerCommand) {
        this.sendToServer({
            type: ServerWorkerMessageInType.Command,
            who: client.name,
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
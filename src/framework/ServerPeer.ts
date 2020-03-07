import { peerOptions } from './Connection';
import Peer from 'peerjs';
import { OfflineConnectionParameters } from './OfflineConnection';
import { errorMessageIdentifier, ServerToClientMessage } from './ServerToClientMessage';
import { ServerWorkerMessageInType, ServerWorkerMessageIn } from './ServerWorkerMessageIn';
import { ClientToServerMessage } from './ClientToServerMessage';

export interface ServerPeerParameters<TServerToClientCommand, TClientState>
    extends OfflineConnectionParameters<TServerToClientCommand, TClientState>
{
    initialState: TClientState;
    clientName: string;
}

export class ServerPeer<TClientToServerCommand, TServerToClientCommand, TClientState> {
    private peer: Peer;
    private readonly clientConnections = new Map<string, Peer.DataConnection>();

    constructor(
        private readonly sendToServer: (message: ServerWorkerMessageIn<TClientToServerCommand>) => void,
        ready: () => void,
    ) {
        this.peer = new Peer(peerOptions);

        console.log('peer created', this.peer);
    
        this.peer.on('error', err => {
            console.log('local connection peer error', err);
        });

        this.peer.on('disconnected', () => {
            console.log('local connection peer has been disconnected');
        });

        this.peer.on('open', id => {
            console.log(`local server's peer ID is ${id}`);
            
            ready();
        });

        this.peer.on('connection', conn => this.peerConnected(conn));
    }

    private peerConnected(conn: Peer.DataConnection) {
        const clientName: string | undefined = conn.metadata?.name?.trim();

        if (!clientName || clientName.length < 1) {
            conn.send([errorMessageIdentifier, 'A name is required']);
            conn.close();
            console.log(`Rejected connection from a peer with no name`);
            return;
        }

        console.log(`Peer connected: ${clientName}`);

        this.clientConnections.set(conn.peer, conn);
        this.sendToServer({
            type: ServerWorkerMessageInType.Join,
            who: conn.peer,
            name: clientName,
        });
        conn.on('close', () => {
            this.clientConnections.delete(conn.peer);
            this.sendToServer({
                type: ServerWorkerMessageInType.Quit,
                who: conn.peer,
            });
        });
        conn.on('data', (data: ClientToServerMessage<TClientToServerCommand>) => {
            console.log(`data received from client ${conn.peer}:`, data);
            if (data[0] === 'a') {
                this.sendToServer({
                    type: ServerWorkerMessageInType.Acknowledge,
                    who: this.peer.id,
                    time: data[1],
                });
            }
            else {
                this.sendToServer({
                    type: ServerWorkerMessageInType.Command,
                    who: conn.peer,
                    command: data[1],
                });
            }
        });
    }

    public sendToClient(client: string | undefined, message: ServerToClientMessage<TServerToClientCommand, TClientState>) {
        if (client === undefined) {
            for (const conn of this.clientConnections.values()) {
                conn.send(message);
            }
        }
        else {
            const conn = this.clientConnections.get(client);
            conn.send(message);
        }
    }

    public disconnect(client?: string) {
        if (client === undefined) {
            for (const conn of this.clientConnections.values()) {
                conn.close();
            }

            this.peer.destroy();
        }
        else {
            const conn = this.clientConnections.get(client);
            conn.close();
        }
    }

    get id() {
        return this.peer.id;
    }
}
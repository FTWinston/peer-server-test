import { peerOptions } from './Connection';
import Peer from 'peerjs';
import { ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { commandMessageIdentifier, deltaStateMessageIdentifier, fullStateMessageIdentifier, errorMessageIdentifier } from './ServerToClientMessage';
import { Delta } from './Delta';
import { ClientToServerMessage } from './ClientToServerMessage';
import { OfflineConnection, OfflineConnectionParameters } from './OfflineConnection';

export interface LocalConnectionParameters< TServerToClientCommand, TClientState>
    extends OfflineConnectionParameters<TServerToClientCommand, TClientState>
{
    initialState: TClientState;
    clientName: string;
}

export class LocalConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
    extends OfflineConnection<TClientToServerCommand, TServerToClientCommand, TClientState> {
    private peer: Peer;
    private readonly clientConnections = new Map<string, Peer.DataConnection>();

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
                
                this.sendMessageToServer({
                    type: ServerWorkerMessageInType.Join,
                    who: this.localId,
                    name: params.clientName,
                });

                ready();
            });
    
            this.peer.on('connection', conn => this.peerConnected(conn));
        });
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
        this.sendMessageToServer({
            type: ServerWorkerMessageInType.Join,
            who: conn.peer,
            name: clientName,
        });
        conn.on('close', () => {
            this.clientConnections.delete(conn.peer);
            this.sendMessageToServer({
                type: ServerWorkerMessageInType.Quit,
                who: conn.peer,
            });
        });
        conn.on('data', (data: ClientToServerMessage<TClientToServerCommand>) => {
            console.log(`data received from client ${conn.peer}:`, data);
            if (data[0] === 'a') {
                this.sendMessageToServer({
                    type: ServerWorkerMessageInType.Acknowledge,
                    who: this.peer.id,
                    time: data[1],
                });
            }
            else {
                this.sendMessageToServer({
                    type: ServerWorkerMessageInType.Command,
                    who: conn.peer,
                    command: data[1],
                });
            }
        });
    }

    protected onServerReady() {
        // DON'T send it a join message until the peer is initialized
    }

    protected dispatchCommandFromServer(client: string | undefined, command: TServerToClientCommand) {
        // commands might specify no client, and so should go to everyone
        if (client === undefined) {
            super.dispatchCommandFromServer(client, command);

            for (const conn of this.clientConnections.values()) {
                conn.send([commandMessageIdentifier, command]);
            }
        }
        else if (client === this.peer.id) {
            super.dispatchCommandFromServer(client, command);
        }
        else {
            const conn = this.clientConnections.get(client);
            conn.send([commandMessageIdentifier, command]);
        }
    }

    protected dispatchFullStateFromServer(client: string, state: TClientState, time: number) {
        if (client === this.peer.id) {
            super.dispatchFullStateFromServer(client, state, time);
        }
        else {
            const conn = this.clientConnections.get(client);
            conn.send([fullStateMessageIdentifier, state, time]);
        }
    }

    protected dispatchDeltaStateFromServer(client: string, state: Delta<TClientState>, time: number) {
        if (client === this.peer.id) {
            super.dispatchDeltaStateFromServer(client, state, time);
        }
        else {
            const conn = this.clientConnections.get(client);
            conn.send([deltaStateMessageIdentifier, state, time]);
        }
    }

    protected dispatchError(client: string | undefined, message: string) {
        // errors might specify no client, and so should go to everyone
        if (client === undefined) {
            for (const conn of this.clientConnections.values()) {
                conn.send([errorMessageIdentifier, message]);
                conn.close();
            }
            
            super.dispatchError(client, message);
        }
        else if (client === this.peer.id) {
            super.dispatchError(client, message);
        }
        else {
            const conn = this.clientConnections.get(client);
            conn.send([errorMessageIdentifier, message]);
            conn.close();
        }
    }

    disconnect() {
        super.disconnect();
        this.peer.destroy();
    }

    get localId() {
        return this.peer.id;
    }
}
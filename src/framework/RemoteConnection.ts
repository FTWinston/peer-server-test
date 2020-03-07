import { Connection, peerOptions, ConnectionMetadata } from './Connection';
import Peer from 'peerjs';
import { ServerToClientMessage, commandMessageIdentifier, deltaStateMessageIdentifier, fullStateMessageIdentifier } from './ServerToClientMessage';
import { acknowledgeMessageIdentifier } from './ClientToServerMessage';

export class RemoteConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
    extends Connection<TClientToServerCommand, TServerToClientCommand, TClientState> {
    private conn: Peer.DataConnection;
    private peer: Peer;
    
    constructor(
        initialState: TClientState,
        serverId: string,
        clientName: string,
        receiveCommand: (cmd: TServerToClientCommand) => void,
        receivedState: (oldState: TClientState) => void,
        ready: () => void
    ) {
        super(initialState, receiveCommand, receivedState);

        console.log(`connecting to server ${serverId}...`);

        this.peer = new Peer(peerOptions);

        this.peer.on('error', err => {
            console.log('remote connection peer error', err);
        });

        this.peer.on('disconnected', () => {
            console.log('remote connection peer has been disconnected');
        });

        this.peer.on('open', id => {
            console.log(`local client's peer ID is ${id}`);

            const metadata: ConnectionMetadata = {
                name: clientName,
            };

            this.conn = this.peer.connect(serverId, {
                reliable: false,
                metadata,
            });

            this.conn.on('open', () => {
                console.log(`connected to server`);

                // this.peer.disconnect(); // TODO: once connected to a server, can disconnect this peer immediately?
    
                ready();

                this.conn.on('data', (data: ServerToClientMessage<TServerToClientCommand, TClientState>) => {
                    if (data[0] === commandMessageIdentifier) {
                        this.receiveCommand(data[1]);
                    }
                    else if (data[0] === fullStateMessageIdentifier) {
                        this.sendAcknowledgement(data[2]);
                        this.receiveFullState(data[1]);
                    }
                    else if (data[0] === deltaStateMessageIdentifier) {
                        this.sendAcknowledgement(data[2]);
                        this.receiveDeltaState(data[1]);
                    }
                    else {
                        console.log('Unrecognised message from server', data);
                    }
                });
            });
        });
    }

    sendCommand(command: TClientToServerCommand) {
        this.conn.send([commandMessageIdentifier, command]);
    }

    sendAcknowledgement(time: number) {
        this.conn.send([acknowledgeMessageIdentifier, time]);
    }

    disconnect() {
        this.conn.close();
        this.peer.destroy();
    }

    get localId() {
        return this.peer.id;
    }
}
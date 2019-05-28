import { Connection, peerOptions } from './Connection';
import Peer from 'peerjs';
import { ServerToClientMessage, commandMessageIdentifier, stateMessageIdentifier } from './ServerToClientMessage';

export class RemoteConnection<TClientToServerCommand, TServerToClientCommand, TServerState, TClientState>
extends Connection<TClientToServerCommand, TServerToClientCommand, TServerState, TClientState> {
    private conn: Peer.DataConnection;

    constructor(
        serverId: string,
        private readonly receiveCommand: (cmd: TServerToClientCommand) => void,
        private readonly receiveState: (state: TClientState) => void,
        ready: () => void
    ) {
        super();

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

            this.conn = this.peer.connect(serverId);

            this.conn.on('open', () => {
                console.log(`connected to server`);

                // this.peer.disconnect(); // TODO: once connected to a server, can disconnect this peer immediately?
    
                ready();

                this.conn.on('data', (data: ServerToClientMessage<TServerToClientCommand, TClientState>) => {
                    if (data[0] === commandMessageIdentifier) {
                        this.receiveCommand(data[1]);
                    }
                    else if (data[0] === stateMessageIdentifier) {
                        this.receiveState(data[1]);
                    }
                    else {
                        console.log('Unrecognised message from server', data);
                    }
                });
            });
        });
    }

    sendCommand(command: TClientToServerCommand) {
        this.conn.send(command);
    }

    disconnect() {
        this.conn.close();
        this.peer.destroy();
    }

    getServerId() { 
        return this.conn.peer;
    }
}
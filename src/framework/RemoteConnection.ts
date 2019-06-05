import { Connection, peerOptions } from './Connection';
import Peer from 'peerjs';
import { ServerToClientMessage, commandMessageIdentifier, deltaStateMessageIdentifier, fullStateMessageIdentifier } from './ServerToClientMessage';
import { DeltaState, FullState } from './State';

export class RemoteConnection<TClientToServerCommand, TServerToClientCommand, TClientEntity>
extends Connection<TClientToServerCommand, TServerToClientCommand, TClientEntity> {
    private conn: Peer.DataConnection;

    constructor(
        serverId: string,
        private readonly receiveCommand: (cmd: TServerToClientCommand) => void,
        private readonly receiveState: (state: FullState<TClientEntity>) => void,
        private readonly getExistingState: () => FullState<TClientEntity>,
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

                this.conn.on('data', (data: ServerToClientMessage<TServerToClientCommand, TClientEntity>) => {
                    if (data[0] === commandMessageIdentifier) {
                        this.receiveCommand(data[1]);
                    }
                    else if (data[0] === fullStateMessageIdentifier) {
                        this.receiveState(data[1]);
                    }
                    else if (data[0] === deltaStateMessageIdentifier) {
                        const delta = data[1];
                        const existingState = this.getExistingState();
                        this.applyDelta(existingState, delta);
                        this.receiveState(existingState);
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
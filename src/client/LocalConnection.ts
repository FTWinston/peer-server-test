import { Connection, peerOptions } from './Connection';
import Peer from 'peerjs';
import ServerWorker from '../server/worker';
import { ServerMessageIn, ServerMessageInType } from '../shared/ServerMessageIn';

export class LocalConnection extends Connection {
    private worker: Worker;

    constructor(receiveMessage: (data: any) => void, ready: () => void) {
        super();
        
        this.worker = new ServerWorker();

        this.worker.onmessage = e => receiveMessage(e.data);

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

        this.peer.on('connection', conn => {
            console.log(`Peer connected: ${conn.peer}`);

            this.sendMessage({
                type: ServerMessageInType.Join,
                who: conn.peer,
            });

            conn.on('close', () => {
                this.sendMessage({
                    type: ServerMessageInType.Quit,
                    who: conn.peer,
                }); 
            })

            conn.on('data', data => {
                console.log(`data received from client ${conn.peer}:`, data);
            });
        });
    }

    private sendMessage(message: ServerMessageIn) {
        this.worker.postMessage(message);
    }

    sendCommand(command: any) {
        this.sendMessage({
            type: ServerMessageInType.Command,
            who: this.peer.id,
            command,
        })
    }

    disconnect() {
        this.worker.terminate();
        this.peer.destroy();
    }

    getServerId() { 
        return this.peer.id;
    }
}
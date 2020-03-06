import { Connection, peerOptions } from './Connection';
import Peer from 'peerjs';
import ServerWorker from '../server/worker';
import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import { commandMessageIdentifier, deltaStateMessageIdentifier, fullStateMessageIdentifier } from './ServerToClientMessage';
import { Delta, applyDelta } from './Delta';
import { ClientToServerMessage } from './ClientToServerMessage';

export class LocalConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
extends Connection<TClientToServerCommand, TServerToClientCommand> {
    private worker: Worker;

    private readonly clientConnections = new Map<string, Peer.DataConnection>();

    constructor(
        private readonly receiveCommand: (cmd: TServerToClientCommand) => void,
        private readonly receiveState: (state: TClientState) => void,
        private readonly getExistingState: () => TClientState,
        ready: () => void
    ) {
        super();
        
        this.worker = new ServerWorker();

        this.worker.onmessage = e => this.receiveMessageFromServer(e.data);

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

            // TODO: if this peer identifier is already in use ... ?
            this.clientConnections.set(conn.peer, conn);

            this.sendMessageToServer({
                type: ServerWorkerMessageInType.Join,
                who: conn.peer,
            });

            conn.on('close', () => {
                this.clientConnections.delete(conn.peer);

                this.sendMessageToServer({
                    type: ServerWorkerMessageInType.Quit,
                    who: conn.peer,
                }); 
            })

            conn.on('data', (data: ClientToServerMessage<TClientToServerCommand>) => {
                console.log(`data received from client ${conn.peer}:`, data);
                const type = data[0];
                const payload = data[1];

                if (type === 'a') {
                    this.sendMessageToServer({
                        type: ServerWorkerMessageInType.Acknowledge,
                        who: this.peer.id,
                        time: payload as number,
                    });
                }
                else {
                    this.sendMessageToServer({
                        type: ServerWorkerMessageInType.Command,
                        who: conn.peer,
                        command: payload as TClientToServerCommand,
                    });
                }
            });
        });
    }

    private receiveMessageFromServer(message: ServerWorkerMessageOut<TServerToClientCommand, TClientState>) {
        switch (message.type) {
            case ServerWorkerMessageOutType.Command:
                this.dispatchCommandFromServer(message.who, message.command);
                break;
            case ServerWorkerMessageOutType.FullState:
                this.dispatchFullStateFromServer(message.who, message.state, message.time);
                break;
            case ServerWorkerMessageOutType.DeltaState:
                this.dispatchDeltaStateFromServer(message.who, message.state, message.time);
                break;
            default:
                console.log('received unrecognised message from worker', message);
                break;
        }
    }

    private dispatchCommandFromServer(client: string | undefined, command: TServerToClientCommand) {
        // commands might specify no client, and so should go to everyone
        if (client === undefined) {
            this.receiveCommand(command);

            for (const conn of this.clientConnections.values()) {
                conn.send([commandMessageIdentifier, command]);
            }
        }
        if (client === this.peer.id) {
            this.receiveCommand(command);
        }
        else {
            const conn = this.clientConnections.get(client);
            conn.send([commandMessageIdentifier, command]);
        }
    }

    private dispatchFullStateFromServer(client: string, state: TClientState, time: number) {
        if (client === this.peer.id) {
            this.sendMessageToServer({
                type: ServerWorkerMessageInType.Acknowledge,
                who: this.peer.id,
                time: time,
            });

            this.receiveState(state);
        }
        else {
            const conn = this.clientConnections.get(client);
            conn.send([fullStateMessageIdentifier, state, time]);
        }
    }

    private dispatchDeltaStateFromServer(client: string, state: Delta<TClientState>, time: number) {
        if (client === this.peer.id) {
            this.sendMessageToServer({
                type: ServerWorkerMessageInType.Acknowledge,
                who: this.peer.id,
                time: time,
            });

            const existingState = this.getExistingState();
            applyDelta(existingState, state);
            this.receiveState(existingState);
        }
        else {
            const conn = this.clientConnections.get(client);
            conn.send([deltaStateMessageIdentifier, state, time]);
        }
    }

    private sendMessageToServer(message: ServerWorkerMessageIn<TClientToServerCommand>) {
        this.worker.postMessage(message);
    }

    sendCommand(command: TClientToServerCommand) {
        this.sendMessageToServer({
            type: ServerWorkerMessageInType.Command,
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
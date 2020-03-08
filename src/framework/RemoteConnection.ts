import { Connection, peerOptions, ConnectionMetadata, ConnectionParameters } from './Connection';
import Peer from 'peerjs';
import { commandMessageIdentifier, deltaStateMessageIdentifier, fullStateMessageIdentifier, errorMessageIdentifier, controlMessageIdentifier, playersMessageIdentifier } from './ServerToClientMessage';
import { acknowledgeMessageIdentifier } from './ClientToServerMessage';

export interface RemoteConnectionParameters<TServerToClientCommand, TClientState>
    extends ConnectionParameters<TServerToClientCommand, TClientState>
{
    initialState: TClientState,
    serverId: string,
    clientName: string,
}

export class RemoteConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
    extends Connection<TClientToServerCommand, TServerToClientCommand, TClientState> {
    private reliable?: Peer.DataConnection;
    private unreliable?: Peer.DataConnection;
    private peer: Peer;
    
    constructor(
        params: RemoteConnectionParameters<TServerToClientCommand, TClientState>,
        ready: () => void,
    ) {
        super(params);

        console.log(`connecting to server ${params.serverId}...`);

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
                name: params.clientName,
            };

            this.reliable = this.peer.connect(params.serverId, {
                reliable: true,
                metadata,
            });

            this.reliable.on('open', () => {
                console.log(`connected to server`);
                ready();
            });
            
            this.reliable.on('data', data =>  {
                if (data[0] === commandMessageIdentifier) {
                    this.updateState(this.receiveCommand(data[1]));
                }
                else if (data[0] === errorMessageIdentifier) {
                    this.receiveError(data[1]);
                    this.disconnect();
                }
                else if (data[0] === controlMessageIdentifier) {
                    this.receiveControl(data[1]);
                }
                else if (data[0] === playersMessageIdentifier) {
                    this.setPlayerList(data[1]);
                }
                else {
                    console.log('Unrecognised message from server', data);
                }
            });
        });
    }

    private receiveControl(operation: string) {
        switch (operation) {
            case 'simulate':
                if (this.unreliable) {
                    break;
                }

                this.unreliable = this.peer.connect(this.reliable.peer, {
                    reliable: false,
                    //metadata,
                });
                
                this.unreliable.on('open', () => {
                    console.log('connected to server state');
                });

                this.unreliable.on('data', data => {
                    if (data[0] === fullStateMessageIdentifier) {
                        this.sendAcknowledgement(data[2]);
                        this.receiveFullState(data[1]);
                    }
                    else if (data[0] === deltaStateMessageIdentifier) {
                        this.sendAcknowledgement(data[2]);
                        this.receiveDeltaState(data[1]);
                    }
                    else {
                        console.log('Unrecognised state from server', data);
                    }
                });
                break;
            default:
                console.log(`unexpected control operation: ${operation}`);
                break;
        }
    }

    sendCommand(command: TClientToServerCommand) {
        this.reliable.send([commandMessageIdentifier, command]);
    }

    sendAcknowledgement(time: number) {
        this.unreliable?.send([acknowledgeMessageIdentifier, time]);
    }

    disconnect() {
        this.reliable.close();
        this.unreliable?.close();
        this.peer.destroy();
    }

    get localId() {
        return this.peer.id;
    }
}
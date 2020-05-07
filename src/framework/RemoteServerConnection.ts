import { ServerConnection, ConnectionParameters } from './ServerConnection';
import { commandMessageIdentifier, deltaStateMessageIdentifier, fullStateMessageIdentifier, errorMessageIdentifier, playersMessageIdentifier } from './ServerToClientMessage';
import { acknowledgeMessageIdentifier } from './ClientToServerMessage';
import { IConnectionSettings } from './SignalConnection';
import { ClientSignalConnection } from './ClientSignalConnection';

export interface RemoteConnectionParameters<TServerToClientCommand, TClientState>
    extends ConnectionParameters<TServerToClientCommand, TClientState>
{
    initialState: TClientState,
    sessionId: string,
    clientName: string,
    signalSettings: IConnectionSettings,
    ready: () => void,
}

export class RemoteServerConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
    extends ServerConnection<TClientToServerCommand, TServerToClientCommand, TClientState> {
    private reliable: RTCDataChannel;
    private unreliable: RTCDataChannel;
    private peer?: RTCPeerConnection;
    private clientName: string;
    
    constructor(
        params: RemoteConnectionParameters<TServerToClientCommand, TClientState>
    ) {
        super(params);
        this.clientName = params.clientName;

        console.log(`connecting to server ${params.sessionId}...`);

        const signal = new ClientSignalConnection(
            params.signalSettings,
            params.sessionId,
            params.clientName,
            peer => {
                this.peer = peer;
                console.log(`connected to server ${params.sessionId}`);
                this.setupPeer(params.ready);
            },
            () => {
                 if (!this.reliable) {
                    // TODO: FLAG THIS UP ... report on the close reason!
                    console.log('disconnected from signal server')
                 }
            }
        );
    }

    private setupPeer(ready: () => void) {
        this.peer.ondatachannel = event => {
            if (event.channel.label === 'reliable') {
                this.reliable = event.channel;

                this.reliable.onmessage = event => {
                    const identifier = event.data[0];

                    if (identifier === commandMessageIdentifier) {
                        this.updateState(this.receiveCommand(event.data[1]));
                    }
                    else if (identifier === errorMessageIdentifier) {
                        this.receiveError(event.data[1]);
                        this.disconnect();
                    }
                    else if (identifier === playersMessageIdentifier) {
                        this.setPlayerList(event.data[1]);
                    }
                    else {
                        console.log('Unrecognised reliable message from server', event.data);
                    }
                }

                ready();
            }
            else if (event.channel.label === 'unreliable') {
                this.unreliable = event.channel;

                this.unreliable.onmessage = event => {
                    const identifier = event.data[0];

                    if (identifier === fullStateMessageIdentifier) {
                        this.sendAcknowledgement(event.data[2]);
                        this.receiveFullState(event.data[1]);
                    }
                    else if (identifier === deltaStateMessageIdentifier) {
                        this.sendAcknowledgement(event.data[2]);
                        this.receiveDeltaState(event.data[1]);
                    }
                    else {
                        console.log('Unrecognised unreliable message from server', event.data);
                    }
                }
            }
            else {
                console.log(`Unexpected data channel opened by server: ${event.channel.label}`);
            }
        }
    }

    sendCommand(command: TClientToServerCommand) {
        this.reliable.send(JSON.stringify([commandMessageIdentifier, command]));
    }

    sendAcknowledgement(time: number) {
        this.unreliable?.send(JSON.stringify([acknowledgeMessageIdentifier, time]));
    }

    disconnect() {
        this.reliable.close();
        this.unreliable?.close();
        this.peer.close();
    }

    get localId() {
        return this.clientName;
    }
}
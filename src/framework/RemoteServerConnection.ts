import { ServerConnection, ConnectionMetadata, ConnectionParameters } from './ServerConnection';
import { commandMessageIdentifier, deltaStateMessageIdentifier, fullStateMessageIdentifier, errorMessageIdentifier, playersMessageIdentifier } from './ServerToClientMessage';
import { acknowledgeMessageIdentifier } from './ClientToServerMessage';
import { joinSession, createPeer } from './Signalling';

export interface RemoteConnectionParameters<TServerToClientCommand, TClientState>
    extends ConnectionParameters<TServerToClientCommand, TClientState>
{
    initialState: TClientState,
    sessionId: string,
    clientName: string,
}

export class RemoteServerConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
    extends ServerConnection<TClientToServerCommand, TServerToClientCommand, TClientState> {
    private reliable: RTCDataChannel;
    private unreliable: RTCDataChannel;
    private peer: RTCPeerConnection;
    private clientName: string;
    
    constructor(
        params: RemoteConnectionParameters<TServerToClientCommand, TClientState>,
        ready: () => void,
    ) {
        super(params);
        this.clientName = params.clientName;

        this.peer = createPeer();

        this.peer.ondatachannel = event => {
            if (event.channel.label === 'reliable') {
                ready();
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

        console.log(`connecting to server ${params.sessionId}...`);

        joinSession(this.peer, params.sessionId, params.clientName)
            .then(response => {
                if (response.success === true) {
                    // TODO: not ready til we open a data channel ... nothing to do here?
                }
                else {
                    throw new Error(response.error);
                }
            });
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
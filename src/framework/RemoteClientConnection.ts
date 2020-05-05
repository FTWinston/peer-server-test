import { IClientConnection } from './IClientConnection';
import { ServerToClientMessage, deltaStateMessageIdentifier, fullStateMessageIdentifier, controlMessageIdentifier } from './ServerToClientMessage';
import { ClientToServerMessage, acknowledgeMessageIdentifier, commandMessageIdentifier } from './ClientToServerMessage';

export class RemoteClientConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
    implements IClientConnection<TServerToClientCommand, TClientState> {

    private readonly reliable: RTCDataChannel;
    private unreliable?: RTCDataChannel;

    constructor(
        readonly clientName: string,
        private readonly peer: RTCPeerConnection,
        connected: () => void,
        private readonly disconnected: () => void,
        private readonly receiveAcknowledge: (time: number) => void,
        private readonly receiveCommand: (command: TClientToServerCommand) => void,
    ) {
        this.reliable = peer.createDataChannel('reliable', {
            ordered: true
        });

        this.reliable.onopen = () => {
            connected();
        };

        this.setupDataChannel(this.reliable);
    }

    private setupDataChannel(
        channel: RTCDataChannel,
    ) {
        channel.onclose = () => this.disconnect();

        channel.onerror = error => {
            console.error(`Error ${error.error.code} in connection to client ${name}: ${error.error.message}`)
            this.disconnect();
        };

        channel.onmessage = event => {
            const data = JSON.parse(event.data) as ClientToServerMessage<TClientToServerCommand>;

            if (data[0] === acknowledgeMessageIdentifier) {
                this.receiveAcknowledge(data[1]);
            }
            else if (data[0] === commandMessageIdentifier) {
                this.receiveCommand(data[1]);
            }
            else {
                console.error(`Unexpected data received from ${this.clientName}: ${data[0]}`)
            }
        }
    }

    send(message: ServerToClientMessage<TServerToClientCommand, TClientState>): void {
        if (message[0] === controlMessageIdentifier) {
            if (message[1] === 'simulate' && this.unreliable === undefined) {
                this.unreliable = this.peer.createDataChannel('unreliable', {
                    ordered: false,
                    maxRetransmits: 0,
                });
        
                this.setupDataChannel(this.unreliable);
            }

            return;
        }

        const channel = this.shouldSendReliably(message[0])
            ? this.reliable
            : this.unreliable;

        channel.send(JSON.stringify(message));
    }

    private shouldSendReliably(messageType: string) {
        return this.unreliable === undefined || (
            messageType !== deltaStateMessageIdentifier
            && messageType !== fullStateMessageIdentifier
        );
    }

    disconnect(): void {
        this.reliable.close();
        this.unreliable.close();

        if (this.peer.connectionState === 'connected') {
            this.peer.close();
            this.disconnected();
        }
    }
}
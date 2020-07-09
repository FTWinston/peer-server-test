import { IClientConnection } from './IClientConnection';
import {
    ServerToClientMessage,
    deltaStateMessageIdentifier,
    fullStateMessageIdentifier,
    controlMessageIdentifier,
    IEvent,
} from './ServerToClientMessage';
import {
    ClientToServerMessage,
    acknowledgeMessageIdentifier,
    commandMessageIdentifier,
} from './ClientToServerMessage';

export class RemoteClientConnection<
    TClientCommand,
    TServerEvent extends IEvent
> implements IClientConnection<TServerEvent> {
    private readonly reliable: RTCDataChannel;
    private unreliable?: RTCDataChannel;

    constructor(
        readonly clientName: string,
        private readonly peer: RTCPeerConnection,
        connected: () => void,
        private readonly disconnected: () => void,
        private readonly receiveAcknowledge: (time: number) => void,
        private readonly receiveCommand: (
            command: TClientCommand
        ) => void
    ) {
        this.reliable = peer.createDataChannel('reliable', {
            ordered: true,
        });

        this.reliable.onopen = () => {
            connected();
        };

        this.setupDataChannel(this.reliable);

        this.peer.onconnectionstatechange = () => {
            if (this.peer.connectionState !== 'connected') {
                this.reportDisconnected();
            }
        };
    }

    private setupDataChannel(channel: RTCDataChannel) {
        channel.onclose = () => this.reportDisconnected();

        channel.onerror = (error) => {
            this.disconnect();
            if (error.error.code !== 0) {
                console.error(
                    `Error ${error.error.code} in connection to client ${this.clientName}: ${error.error.message}`
                );
            }
        };

        channel.onmessage = (event) => {
            const data = JSON.parse(event.data) as ClientToServerMessage<
                TClientCommand
            >;

            if (data[0] === acknowledgeMessageIdentifier) {
                this.receiveAcknowledge(data[1]);
            } else if (data[0] === commandMessageIdentifier) {
                this.receiveCommand(data[1]);
            } else {
                console.error(
                    `Unexpected data received from ${this.clientName}: ${data[0]}`
                );
            }
        };
    }

    send(message: ServerToClientMessage<TServerEvent>): void {
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

        const channel = this.shouldSendReliably(message[0]) || !this.unreliable
            ? this.reliable
            : this.unreliable;

        channel.send(JSON.stringify(message));
    }

    private shouldSendReliably(messageType: string) {
        return (
            this.unreliable === undefined ||
            (messageType !== deltaStateMessageIdentifier &&
                messageType !== fullStateMessageIdentifier)
        );
    }

    disconnect(): void {
        this.reliable.close();
        this.unreliable?.close();

        if (this.peer.connectionState === 'connected') {
            this.peer.close();
        }
    }

    private hasDisconnected = false;
    private reportDisconnected() {
        if (this.hasDisconnected) {
            return;
        }

        this.hasDisconnected = true;
        this.disconnected();
    }
}

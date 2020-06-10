import { ServerConnection, ConnectionParameters } from './ServerConnection';
import {
    commandMessageIdentifier,
    deltaStateMessageIdentifier,
    fullStateMessageIdentifier,
    errorMessageIdentifier,
    ServerToClientMessage,
} from './ServerToClientMessage';
import { acknowledgeMessageIdentifier } from './ClientToServerMessage';
import { IConnectionSettings } from './SignalConnection';
import { ClientSignalConnection } from './ClientSignalConnection';

export interface RemoteConnectionParameters<
    TServerToClientCommand,
    TClientState extends {},
    TLocalState extends {} = {}
>
    extends ConnectionParameters<
        TServerToClientCommand,
        TClientState,
        TLocalState
    > {
    sessionId: string;
    clientName: string;
    signalSettings: IConnectionSettings;
    ready: () => void;
}

export class RemoteServerConnection<
    TClientToServerCommand,
    TServerToClientCommand,
    TClientState extends {},
    TLocalState extends {} = {}
> extends ServerConnection<
    TClientToServerCommand,
    TServerToClientCommand,
    TClientState,
    TLocalState
> {
    private reliable: RTCDataChannel;
    private unreliable: RTCDataChannel;
    private peer?: RTCPeerConnection;
    private clientName: string;

    constructor(
        params: RemoteConnectionParameters<
            TServerToClientCommand,
            TClientState,
            TLocalState
        >
    ) {
        super(params);
        this.clientName = params.clientName;

        console.log(`connecting to server ${params.sessionId}...`);

        const signal = new ClientSignalConnection(
            params.signalSettings,
            params.sessionId,
            params.clientName,
            (peer) => {
                this.peer = peer;
                console.log(`connected to server ${params.sessionId}`);
                this.setupPeer(params.ready);
            },
            () => {
                if (!this.reliable) {
                    // TODO: FLAG THIS UP ... report on the close reason!
                    console.log('disconnected from signal server');
                }
            }
        );
    }

    private setupPeer(ready: () => void) {
        this.peer.ondatachannel = (event) => {
            if (event.channel.label === 'reliable') {
                this.reliable = event.channel;

                this.reliable.onmessage = (event) => {
                    const data = JSON.parse(
                        event.data
                    ) as ServerToClientMessage<TServerToClientCommand>;

                    switch (data[0]) {
                        case fullStateMessageIdentifier:
                            this.receiveFullState(JSON.parse(data[1]));
                            break;

                        case deltaStateMessageIdentifier:
                            this.receiveDeltaState(data[1]);
                            break;

                        case commandMessageIdentifier:
                            this.receiveCommand(data[1]);
                            break;
                        case errorMessageIdentifier:
                            this.receiveError(data[1]);
                            this.disconnect();
                            break;
                        default:
                            console.log(
                                'Unrecognised reliable message from server',
                                event.data
                            );
                            break;
                    }
                };

                this.reliable.onclose = () => this.disconnect();

                ready();
            } else if (event.channel.label === 'unreliable') {
                this.unreliable = event.channel;

                this.unreliable.onmessage = (event) => {
                    const data = JSON.parse(
                        event.data
                    ) as ServerToClientMessage<TServerToClientCommand>;
                    switch (data[0]) {
                        case fullStateMessageIdentifier:
                            this.sendAcknowledgement(data[2]);
                            this.receiveFullState(JSON.parse(data[1]));
                            break;

                        case deltaStateMessageIdentifier:
                            this.sendAcknowledgement(data[2]);
                            this.receiveDeltaState(data[1]);
                            break;

                        default:
                            console.log(
                                'Unrecognised unreliable message from server',
                                event.data
                            );
                            break;
                    }
                };
            } else {
                console.log(
                    `Unexpected data channel opened by server: ${event.channel.label}`
                );
            }
        };
    }

    sendCommand(command: TClientToServerCommand) {
        this.reliable.send(JSON.stringify([commandMessageIdentifier, command]));
    }

    sendAcknowledgement(time: number) {
        this.unreliable?.send(
            JSON.stringify([acknowledgeMessageIdentifier, time])
        );
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

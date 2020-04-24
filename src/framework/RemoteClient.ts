import { IClient } from './IClient';
import { Instance } from 'simple-peer';
import { ServerToClientMessage } from './ServerToClientMessage';
import { ClientToServerMessage, acknowledgeMessageIdentifier, commandMessageIdentifier } from './ClientToServerMessage';

export class RemoteClient<TClientToServerCommand, TServerToClientCommand, TClientState>
    implements IClient<TServerToClientCommand, TClientState> {

    constructor(
        readonly name: string,
        private readonly peer: Instance,
        connected: () => void,
        disconnected: () => void,
        acknowledge: (time: number) => void,
        command: (command: TClientToServerCommand) => void,
    ) {
        peer.on('connect', connected);
        peer.on('close', disconnected);
        peer.on('error', error => {
            console.error(`Error ${(error as any).code} in connection to client ${name}: ${error.message}`)
            disconnected();
        });

        peer.on('data', (strData: string) => {
            const data = JSON.parse(strData) as ClientToServerMessage<TClientToServerCommand>;

            if (data[0] === acknowledgeMessageIdentifier) {
                acknowledge(data[1]);
            }
            else if (data[0] === commandMessageIdentifier) {
                command(data[1]);
            }
            else {
                console.error(`Unexpected data received from ${this.name}: ${data[0]}`)
            }
        });
    }

    send(message: ServerToClientMessage<TServerToClientCommand, TClientState>): void {
        this.peer.send(JSON.stringify(message));
    }

    disconnect(): void {
        this.peer.destroy(new Error('disconnected by server'));
    }
}
import Peer from 'peerjs';

export const peerOptions: Peer.PeerJSOption = {
    // key: 'lwjd5qra8257b9',
};

export abstract class Connection<TClientToServerCommand, TServerToClientCommand, TClientState> {
    constructor(
        protected readonly receiveCommand: (cmd: TServerToClientCommand) => void,
        protected readonly receiveState: (state: TClientState) => void,
        protected readonly getExistingState: () => TClientState,
    ) {
        
    }

    abstract sendCommand(command: TClientToServerCommand): void;

    abstract disconnect(): void;

    abstract get localId(): string;
}
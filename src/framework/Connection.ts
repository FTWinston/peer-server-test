import Peer from 'peerjs';

export const peerOptions: Peer.PeerJSOption = {
    // key: 'lwjd5qra8257b9',
};

export abstract class Connection<TClientToServerCommand, TServerToClientCommand, TServerState, TClientState> {
    protected peer: Peer;
    
    abstract sendCommand(command: TClientToServerCommand): void;

    abstract disconnect(): void;

    abstract getServerId(): string;

    /*
    protected receiveMessage: (e: any) => void;

    protected receiveState: (e: any) => void;
    */
}
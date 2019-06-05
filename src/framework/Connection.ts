import Peer from 'peerjs';
import { DeltaState, FullState } from './State';

export const peerOptions: Peer.PeerJSOption = {
    // key: 'lwjd5qra8257b9',
};

export abstract class Connection<TClientToServerCommand, TServerToClientCommand, TClientEntity> {
    protected peer: Peer;
    
    abstract sendCommand(command: TClientToServerCommand): void;

    abstract disconnect(): void;

    abstract getServerId(): string;

    /*
    protected receiveMessage: (e: any) => void;

    protected receiveState: (e: any) => void;
    */

    protected applyDelta(state: FullState<TClientEntity>, delta: DeltaState<TClientEntity>) {
        for (const entityId in delta) {
            const diff = delta[entityId];

            if (diff === null) {
                // TODO: fire deletion event
                delete state[entityId];
                continue;
            }

            const existing = state[entityId];

            if (existing === null) {
                state[entityId] = diff as TClientEntity;
                // TODO: fire creation event
            }
            else {
                Object.assign(state[entityId], diff);
                // TODO: fire update event
            }
        }
    }
}
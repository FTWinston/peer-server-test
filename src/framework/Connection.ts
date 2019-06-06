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
        const added: number[] = [];
        const modified: number[] = [];
        const deleted: number[] = [];

        for (const [entityId, diff] of delta) {
            if (diff === null) {
                deleted.push(entityId);
                state.delete(entityId);
                continue;
            }

            const existing = state.get(entityId);

            if (existing === undefined) {
                state.set(entityId, diff as TClientEntity)
                added.push(entityId);
            }
            else {
                Object.assign(existing, diff);
                modified.push(entityId);
            }
        }

        // TODO: output added, modified, deleted arrays of entity IDs
    }
}
import { IEntity } from './IEntity';
import { DeltaState, FullState } from './State';

const unacknowledgedDeltaTickInterval = 30; // If this many ticks go unacknowledged, we give up on deltas and start sending full states

export class Client<TClientEntity extends IEntity> {
    public lastAcknowledgedTick?: number;

    private unacknowledgedDeltas: Record<number, DeltaState<TClientEntity>> = {};

    public acknowledge(tickId: number) {
        for (const testTickId in this.unacknowledgedDeltas) {
            if ((testTickId as unknown as number) <= tickId) {
                delete this.unacknowledgedDeltas[testTickId];
            }
        }
    }

    public shouldSendFullState(tickId: number) {
        return !(this.lastAcknowledgedTick > tickId - unacknowledgedDeltaTickInterval);
    }

    public sendDeltaState(tickId: number, delta: DeltaState<TClientEntity>) {
        this.unacknowledgedDeltas[tickId] = delta;

        const cumulativeDelta: DeltaState<TClientEntity> = {};
        
        // combine all unacknowledged deltas into one
        for (const prevTickId in this.unacknowledgedDeltas) {
            const prevDelta = this.unacknowledgedDeltas[prevTickId];

            for (const prevEntityId in prevDelta) {
                const entity = cumulativeDelta[prevEntityId as unknown as number];

                if (!entity) {
                    cumulativeDelta[prevEntityId] = Object.assign({}, prevDelta[prevEntityId])
                }
                else {
                    Object.assign(entity, prevDelta[prevEntityId]);
                }
            }
        }

        return cumulativeDelta;
    }

    public sendFullState(tickId: number, state: FullState<TClientEntity>) {
        // disregard any delta history, cos we're sending full states now
        this.unacknowledgedDeltas = {};
        this.unacknowledgedDeltas[tickId] = state;
    }
}
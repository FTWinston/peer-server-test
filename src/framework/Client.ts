import { IEntity } from './IEntity';
import { DeltaState, FullState } from './State';

const unacknowledgedDeltaTickInterval = 30; // If this many ticks go unacknowledged, we give up on deltas and start sending full states

export class Client<TClientEntity extends IEntity> {
    public lastAcknowledgedTick?: number;

    private readonly unacknowledgedDeltas = new Map<number, DeltaState<TClientEntity>>();

    public acknowledge(tickId: number) {
        for (const testTickId of this.unacknowledgedDeltas.keys()) {
            if ((testTickId as unknown as number) <= tickId) {
                this.unacknowledgedDeltas.delete(testTickId);
            }
        }
    }

    public shouldSendFullState(tickId: number) {
        return !(this.lastAcknowledgedTick > tickId - unacknowledgedDeltaTickInterval);
    }

    public sendDeltaState(tickId: number, delta: DeltaState<TClientEntity>) {
        this.unacknowledgedDeltas.set(tickId, delta);

        return this.combineUnacknowledgedDeltas();
    }

    private combineUnacknowledgedDeltas() {
        const cumulativeDelta = new DeltaState<TClientEntity>();
        
        for (const [, delta] of this.unacknowledgedDeltas) {
            for (const [entityId, entity] of delta) {
                const cumulativeEntity = cumulativeDelta.get(entityId);

                if (cumulativeEntity === undefined) {
                    cumulativeDelta.set(entityId, Object.assign({}, entity));
                }
                else {
                    Object.assign(cumulativeEntity, entity);
                }
            }
        }

        return cumulativeDelta;
    }

    public sendFullState(tickId: number, state: FullState<TClientEntity>) {
        // disregard any delta history, cos we're sending full states now
        this.unacknowledgedDeltas.clear();
        this.unacknowledgedDeltas.set(tickId, state);
    }
}
import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import { Delta, applyDelta } from './Delta';

const unacknowledgedDeltaInterval = 1000; // If we go for this may milliseconds with no acknowledgements, we give up on deltas and start sending full states

export class ClientStateManager<TClientState, TServerToClientCommand> {
    public lastAcknowledgedTime?: number;

    private readonly unacknowledgedDeltas = new Map<number, Delta<TClientState>>();

    public constructor(
        public readonly name: string,
        private readonly sendMessage: (message: ServerWorkerMessageOut<TServerToClientCommand, TClientState>) => void
    ) { }

    public acknowledge(time: number) {
        for (const testTime of this.unacknowledgedDeltas.keys()) {
            if ((testTime as unknown as number) <= time) {
                this.unacknowledgedDeltas.delete(testTime);
            }
        }
    }

    public shouldSendFullState(time: number) {
        return !(this.lastAcknowledgedTime > time - unacknowledgedDeltaInterval);
    }

    public sendFullState(time: number, state: TClientState) {
        // disregard any delta history, cos we're sending full states now
        this.unacknowledgedDeltas.clear();
        this.unacknowledgedDeltas.set(time, state);

        this.sendMessage({
            type: ServerWorkerMessageOutType.FullState,
            who: this.name,
            time,
            state,
        });
    }

    public sendDeltaState(time: number, delta: Delta<TClientState>) {
        this.unacknowledgedDeltas.set(time, delta);

        const cumulativeDelta = this.combineUnacknowledgedDeltas(); // TODO: could we cache this?

        this.sendMessage({
            type: ServerWorkerMessageOutType.DeltaState,
            who: this.name,
            time,
            state: cumulativeDelta,
        });
    }

    private combineUnacknowledgedDeltas() {
        let cumulativeDelta: Partial<Delta<TClientState>> = {};
        
        for (const [, delta] of this.unacknowledgedDeltas) {
            applyDelta(cumulativeDelta, delta);
        }

        return cumulativeDelta;
    }
}
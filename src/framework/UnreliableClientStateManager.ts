import { ServerWorkerMessageOut } from './ServerWorkerMessageOut';
import { ClientStateManager } from './ClientStateManager';
import { PatchOperation } from 'filter-mirror';

const unacknowledgedDeltaInterval = 1000; // If we go for this may milliseconds with no acknowledgements, we give up on deltas and start sending full states

export class UnreliableClientStateManager<
    TClientState,
    TServerEvent
> extends ClientStateManager<TClientState, TServerEvent> {
    public lastAcknowledgedTime: number = -unacknowledgedDeltaInterval;

    private readonly unacknowledgedDeltas = new Map<number, PatchOperation[]>();

    public constructor(
        name: string,
        getInitialState: (
            callback: (patch: PatchOperation) => void
        ) => TClientState,
        sendMessage: (
            message: ServerWorkerMessageOut<TServerEvent>
        ) => void
    ) {
        super(name, getInitialState, sendMessage);
    }

    public acknowledge(time: number) {
        this.lastAcknowledgedTime = time;

        for (const testTime of this.unacknowledgedDeltas.keys()) {
            if (((testTime as unknown) as number) <= time) {
                this.unacknowledgedDeltas.delete(testTime);
            }
        }
    }

    protected shouldSendFullState(time: number) {
        return (
            super.shouldSendFullState(time) ||
            this.lastAcknowledgedTime <= time - unacknowledgedDeltaInterval
        );
    }

    protected sendFullState(time: number, state: TClientState) {
        // Disregard any delta history, cos we'll keep sending full states til they acknowledge something.
        this.unacknowledgedDeltas.clear();

        super.sendFullState(time, state);
    }

    protected sendStateUpdate(time: number, patches: PatchOperation[]) {
        this.unacknowledgedDeltas.set(time, patches);

        const cumulativeDelta = this.combineUnacknowledgedDeltas(); // TODO: could we cache this?

        super.sendStateUpdate(time, cumulativeDelta);
    }

    private combineUnacknowledgedDeltas() {
        let cumulativeDelta: PatchOperation[] = [];

        for (const [, delta] of this.unacknowledgedDeltas) {
            cumulativeDelta = [...cumulativeDelta, ...delta];
        }

        // TODO: consider squashing duplicate entries.
        // Would use json-squash here, but would then have to convert the patches to proper json patch standard.
        return cumulativeDelta;
    }
}

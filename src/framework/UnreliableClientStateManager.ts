import { ServerWorkerMessageOut } from './ServerWorkerMessageOut';
import { ClientStateManager } from './ClientStateManager';
import { Draft, Patch } from 'immer';

const unacknowledgedDeltaInterval = 1000; // If we go for this may milliseconds with no acknowledgements, we give up on deltas and start sending full states

export class UnreliableClientStateManager<
    TClientState,
    TServerToClientCommand
> extends ClientStateManager<TClientState, TServerToClientCommand> {
    public lastAcknowledgedTime?: number;

    private readonly unacknowledgedDeltas = new Map<number, Patch[]>();

    public constructor(
        name: string,
        state: TClientState,
        sendMessage: (
            message: ServerWorkerMessageOut<
                TServerToClientCommand,
                TClientState
            >
        ) => void,
        registerProxy: (newState: TClientState | Draft<TClientState>) => void
    ) {
        super(name, state, sendMessage, registerProxy);
    }

    public acknowledge(time: number) {
        for (const testTime of this.unacknowledgedDeltas.keys()) {
            if (((testTime as unknown) as number) <= time) {
                this.unacknowledgedDeltas.delete(testTime);
            }
        }
    }

    protected shouldSendFullState(time: number) {
        return this.lastAcknowledgedTime <= time - unacknowledgedDeltaInterval;
    }

    protected sendFullState(time: number, state: TClientState) {
        // Disregard any delta history, cos we'll keep sending full states til they acknowledge something.
        this.unacknowledgedDeltas.clear();

        super.sendFullState(time, state);
    }

    protected sendStateUpdate(time: number, patches: Patch[]) {
        this.unacknowledgedDeltas.set(time, patches);

        const cumulativeDelta = this.combineUnacknowledgedDeltas(); // TODO: could we cache this?

        super.sendStateUpdate(time, cumulativeDelta);
    }

    private combineUnacknowledgedDeltas() {
        let cumulativeDelta: Patch[] = [];

        for (const [, delta] of this.unacknowledgedDeltas) {
            cumulativeDelta = [...cumulativeDelta, ...delta];
        }

        // TODO: consider squashing duplicate entries.
        // Would use json-squash here, but would then have to convert the patches to proper json patch standard.
        return cumulativeDelta;
    }
}

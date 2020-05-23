import {
    ServerWorkerMessageOut,
    ServerWorkerMessageOutType,
} from './ServerWorkerMessageOut';
import { Draft, createDraft, finishDraft, Patch, enablePatches, setAutoFreeze } from 'immer';

enablePatches();
setAutoFreeze(false); // Perhaps immer isn't the best fit if we just use it for patch generation.

export class ClientStateManager<TClientState, TServerToClientCommand> {
    public constructor(
        public readonly name: string,
        private state: TClientState,
        private readonly sendMessage: (
            message: ServerWorkerMessageOut<
                TServerToClientCommand,
                TClientState
            >
        ) => void,
        protected readonly registerProxy: (
            newState: TClientState | Draft<TClientState>
        ) => void
    ) {
        this.updateDraft();
    }

    private draftState: Draft<TClientState> | undefined;

    private updateDraft() {
        this.draftState = createDraft(this.state);

        this.registerProxy(this.draftState);
    }

    public sendState(time: number) {
        if (this.draftState === undefined) {
            this.sendFullState(time, this.state);
        } else if (this.shouldSendFullState(time)) {
            this.state = finishDraft(this.draftState);
            this.sendFullState(time, this.state);
        } else {
            this.state = finishDraft(this.draftState, (patches) => {
                this.sendStateUpdate(time, patches);
            });
        }

        this.updateDraft();
    }

    protected shouldSendFullState(time: number) {
        return false;
    }

    protected sendFullState(time: number, state: TClientState) {
        this.sendMessage({
            type: ServerWorkerMessageOutType.FullState,
            who: this.name,
            time,
            state,
        });
    }

    protected sendStateUpdate(time: number, patches: Patch[]) {
        this.sendMessage({
            type: ServerWorkerMessageOutType.DeltaState,
            who: this.name,
            time,
            state: patches,
        });
    }
}

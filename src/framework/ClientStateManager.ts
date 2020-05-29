import {
    ServerWorkerMessageOut,
    ServerWorkerMessageOutType,
} from './ServerWorkerMessageOut';
import { PatchOperation } from 'filter-mirror';

export class ClientStateManager<TClientState, TServerToClientCommand> {
    public constructor(
        public readonly name: string,
        getInitialState: (callback: (patch: PatchOperation) => void) => TClientState,
        private readonly sendMessage: (
            message: ServerWorkerMessageOut<
                TServerToClientCommand,
                TClientState
            >
        ) => void
    ) {
        this.state = getInitialState(patch => this.patches.push(patch));
    }

    private state: TClientState;

    private patches: PatchOperation[] = [];

    public receiveChange(patch: PatchOperation) {
        this.patches.push(patch);
    }

    public sendState(time: number) {
        if (this.shouldSendFullState(time)) {
            this.sendFullState(time, this.state);
            this.forceSendFullState = false;
            this.patches = [];
        } else {
            this.sendStateUpdate(time, this.patches);
            this.patches = [];
        }
    }

    private forceSendFullState = true;

    protected shouldSendFullState(time: number) {
        return this.forceSendFullState;
    }

    protected sendFullState(time: number, state: TClientState) {
        console.log(`sending full state to ${this.name}: `, state);
        this.sendMessage({
            type: ServerWorkerMessageOutType.FullState,
            who: this.name,
            time,
            state,
        });
    }

    protected sendStateUpdate(time: number, patches: PatchOperation[]) {
        if (patches.length === 0) {
            return;
        }

        console.log(`sending state patch to ${this.name}: `, patches);
        this.sendMessage({
            type: ServerWorkerMessageOutType.DeltaState,
            who: this.name,
            time,
            state: patches,
        });
        
    }
}

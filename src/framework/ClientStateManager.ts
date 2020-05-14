import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import produce, { Draft, createDraft, finishDraft, Patch } from 'immer';

export class ClientStateManager<TServerState, TClientState, TServerToClientCommand> {
    public constructor(
        public readonly name: string,
        private readonly sendMessage: (message: ServerWorkerMessageOut<TServerToClientCommand, TClientState>) => void,
        protected readonly updateClientState: (client: string, clientState: Partial<Draft<TClientState>>, prevServerState: TServerState | null, serverState: TServerState) => void,
    ) { }

    private lastServerState: TServerState | null = null;
    private clientState: TClientState = {} as TClientState;

    public sendState(time: number, serverState: TServerState) {
        const draftClientState = createDraft(this.clientState);

        this.updateClientState(this.name, draftClientState, this.lastServerState, serverState)

        if (this.shouldSendFullState(time)) {
            this.clientState = finishDraft(draftClientState);

            this.sendFullState(time, this.clientState);
        }
        else {
            this.clientState = finishDraft(draftClientState, patches => {
                this.sendStateUpdate(time, patches);
            });
        }

        this.lastServerState = serverState;
    }

    protected shouldSendFullState(time: number) {
        return this.lastServerState == null;
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
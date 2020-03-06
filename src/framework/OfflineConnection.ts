import { Connection } from './Connection';
import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import { Delta, applyDelta } from './Delta';

export class OfflineConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
    extends Connection<TClientToServerCommand, TServerToClientCommand, TClientState> {

    constructor(
        private readonly worker: Worker,
        receiveCommand: (cmd: TServerToClientCommand) => void,
        receiveState: (state: TClientState) => void,
        getExistingState: () => TClientState,
        ready: () => void
    ) {
        super(receiveCommand, receiveState, getExistingState);
        
        this.worker.onmessage = e => this.receiveMessageFromServer(e.data);

        this.sendMessageToServer({
            type: ServerWorkerMessageInType.Join,
            who: this.localId,
        });

        ready();
    }

    private receiveMessageFromServer(message: ServerWorkerMessageOut<TServerToClientCommand, TClientState>) {
        switch (message.type) {
            case ServerWorkerMessageOutType.Command:
                this.dispatchCommandFromServer(message.who, message.command);
                break;
            case ServerWorkerMessageOutType.FullState:
                this.dispatchFullStateFromServer(message.who, message.state, message.time);
                break;
            case ServerWorkerMessageOutType.DeltaState:
                this.dispatchDeltaStateFromServer(message.who, message.state, message.time);
                break;
            default:
                console.log('received unrecognised message from worker', message);
                break;
        }
    }

    protected dispatchCommandFromServer(client: string | undefined, command: TServerToClientCommand) {
        this.receiveCommand(command);
    }

    protected dispatchFullStateFromServer(client: string, state: TClientState, time: number) {
        this.sendMessageToServer({
            type: ServerWorkerMessageInType.Acknowledge,
            who: this.localId,
            time: time,
        });

        this.receiveState(state);
    }

    protected dispatchDeltaStateFromServer(client: string, state: Delta<TClientState>, time: number) {
        this.sendMessageToServer({
            type: ServerWorkerMessageInType.Acknowledge,
            who: this.localId,
            time: time,
        });

        const existingState = this.getExistingState();
        applyDelta(existingState, state);
        this.receiveState(existingState);
    }

    protected sendMessageToServer(message: ServerWorkerMessageIn<TClientToServerCommand>) {
        this.worker.postMessage(message);
    }

    sendCommand(command: TClientToServerCommand) {
        this.sendMessageToServer({
            type: ServerWorkerMessageInType.Command,
            who: this.localId,
            command,
        })
    }

    disconnect() {
        this.worker.terminate();
    }

    get localId() { return 'local'; }
}
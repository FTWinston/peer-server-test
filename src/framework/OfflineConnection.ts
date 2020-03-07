import { Connection } from './Connection';
import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import { Delta } from './Delta';

export class OfflineConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
    extends Connection<TClientToServerCommand, TServerToClientCommand, TClientState> {

    constructor(
        initialState: TClientState,
        private readonly worker: Worker,
        receiveCommand: (cmd: TServerToClientCommand) => void,
        receivedState: (oldState: TClientState) => void,
        ready: () => void
    ) {
        super(initialState, receiveCommand, receivedState);
        
        this.worker.onmessage = e => this.receiveMessageFromServer(e.data);

        this.ready = ready;
    }

    private ready?: () => void;

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
            case ServerWorkerMessageOutType.Ready:
                if (this.ready) {
                    this.onServerReady();
                    this.ready();
                    delete this.ready;
                }
                break;
            default:
                console.log('received unrecognised message from worker', message);
                break;
        }
    }

    protected onServerReady() {
        this.sendMessageToServer({
            type: ServerWorkerMessageInType.Join,
            who: this.localId,
            name: this.localId,
        });
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

        this.receiveFullState(state);
    }

    protected dispatchDeltaStateFromServer(client: string, state: Delta<TClientState>, time: number) {
        this.sendMessageToServer({
            type: ServerWorkerMessageInType.Acknowledge,
            who: this.localId,
            time: time,
        });

        this.receiveDeltaState(state);
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
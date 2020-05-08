import { ServerConnection, ConnectionParameters } from './ServerConnection';
import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import { Delta, applyDelta } from './Delta';
import { ControlOperation } from './ServerToClientMessage';

export interface OfflineConnectionParameters<TServerToClientCommand, TClientState>
    extends ConnectionParameters<TServerToClientCommand, TClientState>
{
    worker: Worker;
}

export class OfflineServerConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
    extends ServerConnection<TClientToServerCommand, TServerToClientCommand, TClientState> {

    constructor(
        params: OfflineConnectionParameters<TServerToClientCommand, TClientState>,
        ready: () => void,
    ) {
        super(params);
        this.worker = params.worker;
        this.worker.onmessage = e => this.receiveMessageFromServer(e.data);
        this.ready = ready;
    }

    private readonly worker: Worker;
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
            case ServerWorkerMessageOutType.Disconnect:
                this.dispatchError(message.who, message.message);
                break;
            case ServerWorkerMessageOutType.Control:
                this.dispatchControl(message.who, message.operation);
                break;
            case ServerWorkerMessageOutType.Players:
                this.dispatchPlayerList(message.players);
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
        });
    }

    protected dispatchCommandFromServer(client: string | undefined, command: TServerToClientCommand) {
        const delta = this.receiveCommand(command);
        
        if (delta) {
            applyDelta(this.localState, delta);
        }
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

    protected dispatchError(client: string | undefined, message: string) {
        this.receiveError(message);
        this.disconnect();
    }

    protected dispatchControl(client: string | undefined, message: ControlOperation) { }

    protected dispatchPlayerList(players: string[]) {
        this.setPlayerList(players);
    }

    disconnect() {
        this.worker.terminate();
    }

    get localId() { return 'local'; }
}
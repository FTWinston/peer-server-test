import { ServerConnection, ConnectionParameters } from './ServerConnection';
import {
    ServerWorkerMessageIn,
    ServerWorkerMessageInType,
} from './ServerWorkerMessageIn';
import {
    ServerWorkerMessageOut,
    ServerWorkerMessageOutType,
} from './ServerWorkerMessageOut';
import { ControlOperation } from './ServerToClientMessage';
import { PatchOperation } from 'filter-mirror';

export interface OfflineConnectionParameters<
    TServerToClientCommand,
    TClientState extends {},
    TLocalState extends {} = {}
>
    extends ConnectionParameters<
        TServerToClientCommand,
        TClientState,
        TLocalState
    > {
    worker: Worker;
}

export class OfflineServerConnection<
    TClientToServerCommand,
    TServerToClientCommand,
    TClientState extends {},
    TLocalState extends {} = {}
> extends ServerConnection<
    TClientToServerCommand,
    TServerToClientCommand,
    TClientState,
    TLocalState
> {
    constructor(
        params: OfflineConnectionParameters<
            TServerToClientCommand,
            TClientState,
            TLocalState
        >,
        ready: () => void
    ) {
        super(params);
        this.worker = params.worker;
        this.worker.onmessage = (e) => this.receiveMessageFromServer(e.data);
        this.ready = ready;
    }

    private readonly worker: Worker;
    private ready?: () => void;

    private receiveMessageFromServer(
        message: ServerWorkerMessageOut<TServerToClientCommand>
    ) {
        switch (message.type) {
            case ServerWorkerMessageOutType.Command:
                this.dispatchCommandFromServer(message.who, message.command);
                break;
            case ServerWorkerMessageOutType.FullState:
                this.dispatchFullStateFromServer(
                    message.who,
                    message.state,
                    message.time
                );
                break;
            case ServerWorkerMessageOutType.DeltaState:
                this.dispatchDeltaStateFromServer(
                    message.who,
                    message.state,
                    message.time
                );
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
            default:
                console.log(
                    'received unrecognised message from worker',
                    message
                );
                break;
        }
    }

    protected onServerReady() {
        this.sendMessageToServer({
            type: ServerWorkerMessageInType.Join,
            who: this.localId,
        });
    }

    protected dispatchCommandFromServer(
        client: string | undefined,
        command: TServerToClientCommand
    ) {
        this.receiveCommand(command);
    }

    protected dispatchFullStateFromServer(
        client: string,
        state: string,
        time: number
    ) {
        this.sendMessageToServer({
            type: ServerWorkerMessageInType.Acknowledge,
            who: this.localId,
            time: time,
        });

        this.receiveFullState(JSON.parse(state));
    }

    protected dispatchDeltaStateFromServer(
        client: string,
        state: PatchOperation[],
        time: number
    ) {
        this.sendMessageToServer({
            type: ServerWorkerMessageInType.Acknowledge,
            who: this.localId,
            time: time,
        });

        this.receiveDeltaState(state);
    }

    protected sendMessageToServer(
        message: ServerWorkerMessageIn<TClientToServerCommand>
    ) {
        this.worker.postMessage(message);
    }

    sendCommand(command: TClientToServerCommand) {
        this.sendMessageToServer({
            type: ServerWorkerMessageInType.Command,
            who: this.localId,
            command,
        });
    }

    protected dispatchError(client: string | undefined, message: string) {
        this.receiveError(message);
        this.disconnect();
    }

    protected dispatchControl(
        client: string | undefined,
        message: ControlOperation
    ) {}

    disconnect() {
        this.worker.terminate();
    }

    get localId() {
        return 'local';
    }
    
    get sessionId() {
        return '';
    }
}

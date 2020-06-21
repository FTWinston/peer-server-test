import { ServerConnection, ConnectionParameters } from './ServerConnection';
import {
    ServerWorkerMessageIn,
    ServerWorkerMessageInType,
} from './ServerWorkerMessageIn';
import {
    ServerWorkerMessageOut,
    ServerWorkerMessageOutType,
} from './ServerWorkerMessageOut';
import { ControlOperation, IEvent, SystemEvent } from './ServerToClientMessage';
import { PatchOperation } from 'filter-mirror';

export interface OfflineConnectionParameters<
    TEvent extends IEvent,
    TClientState extends {},
    TLocalState extends {} = {}
>
    extends ConnectionParameters<
        TEvent,
        TClientState,
        TLocalState
    > {
    worker: Worker;
}

export class OfflineServerConnection<
    TClientToServerCommand,
    TEvent extends IEvent,
    TClientState extends {},
    TLocalState extends {} = {}
> extends ServerConnection<
    TClientToServerCommand,
    TEvent,
    TClientState,
    TLocalState
> {
    constructor(
        params: OfflineConnectionParameters<
            TEvent,
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
        message: ServerWorkerMessageOut<TEvent>
    ) {
        switch (message.type) {
            case ServerWorkerMessageOutType.Event:
                this.dispatchEvent(message.who, message.command);
                break;
            case ServerWorkerMessageOutType.FullState:
                this.dispatchFullState(
                    message.who,
                    message.state,
                    message.time
                );
                break;
            case ServerWorkerMessageOutType.DeltaState:
                this.dispatchDeltaState(
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

    protected dispatchEvent(
        client: string | undefined,
        event: TEvent | SystemEvent
    ) {
        this.receiveEvent(event);
    }

    protected dispatchFullState(
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

    protected dispatchDeltaState(
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

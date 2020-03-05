import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import { ClientData } from './ClientData';
import { Delta, applyDelta } from './Delta';

export abstract class Server<TServerState extends {}, TClientState extends {}, TClientToServerCommand, TServerToClientCommand> {
    private readonly sendMessage: (message: ServerWorkerMessageOut<TServerToClientCommand, TClientState>) => void;

    private readonly clientData = new Map<string, ClientData<TClientState, TServerToClientCommand>>();

    private state: TServerState;

    constructor(worker: Worker, initialState: TServerState) {
        this.state = initialState;
        this.sendMessage = worker.postMessage;
        worker.onmessage = e => this.receiveMessage(e.data);
    }

    public receiveMessage(message: ServerWorkerMessageIn<TClientToServerCommand>) {
        switch (message.type) {
            case ServerWorkerMessageInType.Join:
                this.clientData.set(message.who, new ClientData<TClientState, TServerToClientCommand>(message.who, this.sendMessage));
                this.updateState(this.clientJoined(message.who));
                break;
            case ServerWorkerMessageInType.Quit:
                this.clientData.delete(message.who);
                this.updateState(this.clientQuit(message.who));
                break;
            case ServerWorkerMessageInType.Command:
                console.log(`${message.who} issued a command`, message.command);
                this.updateState(this.receiveCommandFromClient(message.who, message.command));
                break;
            default:
                console.log('worker received unrecognised message', message);
                break;
        }
    }

    protected updateState(stateDelta?: Delta<TServerState>) {
        if (stateDelta === undefined) {
            return;
        }

        const newState = { ...this.state };

        applyDelta(newState, stateDelta);

        this.state = newState;

        const time = Math.round(performance.now()); // ms since the page was opened
        for (const [_, client] of this.clientData) {
            this.sendState(client, stateDelta, time);
        }
    }

    protected clientJoined(who: string): Delta<TServerState> | undefined { return undefined; }
    protected clientQuit(who: string): Delta<TServerState> | undefined { return undefined; }

    protected abstract receiveCommandFromClient(who: string, command: TClientToServerCommand): Delta<TServerState> | undefined;

    private sendState(client: ClientData<TClientState, TServerToClientCommand>, stateDelta: Delta<TServerState>, time: number) {
        if (client.shouldSendFullState(time)) {
            const clientState = this.getFullStateToSendClient(client.id, this.state);
            client.sendFullState(time, clientState);
        }
        else {
            const clientDelta = this.getDeltaStateToSendClient(client.id, stateDelta);
            client.sendDeltaState(time, clientDelta);
        }
    }

    protected sendCommand(client: string | undefined, command: TServerToClientCommand) {
        this.sendMessage({
            type: ServerWorkerMessageOutType.Command,
            who: client,
            command,
        });
    }

    protected abstract getFullStateToSendClient(who: string, serverState: TServerState): TClientState;

    protected abstract getDeltaStateToSendClient(who: string, serverDelta: Delta<TServerState>): Delta<TClientState>;
}
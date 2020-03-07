import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import { ClientData } from './ClientData';
import { Delta, applyDelta } from './Delta';
import { ClientInfo } from './ClientInfo';

export abstract class Server<TServerState extends {}, TClientState extends {}, TClientToServerCommand, TServerToClientCommand> {
    private readonly clientData = new Map<string, ClientData<TClientState, TServerToClientCommand>>();

    private state: TServerState;

    constructor(
        initialState: TServerState,
        private readonly sendMessage: (message: ServerWorkerMessageOut<TServerToClientCommand, TClientState>) => void
    ) {
        this.state = initialState;

        sendMessage({
            type: ServerWorkerMessageOutType.Ready,
        });
    }

    public receiveMessage(message: ServerWorkerMessageIn<TClientToServerCommand>) {
        switch (message.type) {
            case ServerWorkerMessageInType.Join: {
                const info = {
                    id: message.who,
                    name: message.name
                };
                this.clientData.set(
                    message.who,
                    new ClientData<TClientState, TServerToClientCommand>(
                        info,
                        this.sendMessage
                    )
                );
                this.updateState(this.clientJoined(info));
                break;
                    }

            case ServerWorkerMessageInType.Quit: {
                const info = this.clientData.get(message.who).info;
                this.clientData.delete(message.who);
                this.updateState(this.clientQuit(info));
                break;
            }

            case ServerWorkerMessageInType.Acknowledge: {
                const client = this.clientData.get(message.who);
                client?.acknowledge(message.time);
                break;
            }

            case ServerWorkerMessageInType.Command: {
                const client = this.clientData.get(message.who);
                console.log(`${client.info.name} issued a command`, message.command);
                this.updateState(this.receiveCommandFromClient(client.info, message.command));
                break;
            }

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

    protected clientJoined(client: ClientInfo): Delta<TServerState> | undefined { return undefined; }
    protected clientQuit(client: ClientInfo): Delta<TServerState> | undefined { return undefined; }

    protected abstract receiveCommandFromClient(client: ClientInfo, command: TClientToServerCommand): Delta<TServerState> | undefined;

    private sendState(client: ClientData<TClientState, TServerToClientCommand>, stateDelta: Delta<TServerState>, time: number) {
        if (client.shouldSendFullState(time)) {
            const clientState = this.getFullStateToSendClient(client.info, this.state);
            client.sendFullState(time, clientState);
        }
        else {
            const clientDelta = this.getDeltaStateToSendClient(client.info, stateDelta, this.state);
            client.sendDeltaState(time, clientDelta);
        }
    }

    protected sendCommand(client: ClientInfo | undefined, command: TServerToClientCommand) {
        this.sendMessage({
            type: ServerWorkerMessageOutType.Command,
            who: client.id,
            command,
        });
    }

    protected abstract getFullStateToSendClient(client: ClientInfo, serverState: TServerState): TClientState;

    protected abstract getDeltaStateToSendClient(client: ClientInfo, serverDelta: Delta<TServerState>, fullState: TServerState): Delta<TClientState>;
}
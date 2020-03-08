import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import { Delta, applyDelta } from './Delta';
import { ClientInfo } from './ClientInfo';

export abstract class Server<TServerState extends {}, TClientState extends {}, TClientToServerCommand, TServerToClientCommand> {
    private readonly _clients = new Map<string, ClientInfo>();

    protected get clients(): ReadonlyMap<string, ClientInfo> { return this._clients; }

    private _state: TServerState;

    protected get state(): Readonly<TServerState> { return this._state; }

    constructor(
        initialState: TServerState,
        protected readonly sendMessage: (message: ServerWorkerMessageOut<TServerToClientCommand, TClientState>) => void
    ) {
        this._state = initialState;

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

                const joinError = this.getJoinError(info);

                if (joinError !== null) {
                    this.sendMessage({
                        type: ServerWorkerMessageOutType.Disconnect,
                        who: info.id,
                        message: joinError,
                    });
                    break;
                }
                
                this._clients.set(info.id, info);
                this.updateState(this.clientJoined(info));
                break;
            }

            case ServerWorkerMessageInType.Quit: {
                const client = this._clients.get(message.who);
                if (client) {
                    this.updateState(this.clientQuit(client));
                }
                break;
            }

            case ServerWorkerMessageInType.Command: {
                const client = this._clients.get(message.who);
                if (client) {
                    console.log(`${client.name} issued a command`, message.command);
                    this.updateState(this.receiveCommandFromClient(client, message.command));
                }
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

        const newState = { ...this._state };

        applyDelta(newState, stateDelta);

        this._state = newState;
    }

    protected getJoinError(client: ClientInfo): string | null {
        if (client.name.length > 50) {
            return 'Your name is too long';
        }

        const existingClients = [...this._clients.values()];
        if (existingClients.find(existing => existing.name.trim() === client.name.trim())) {
            return 'Your name is already in use';
        }

        return null;
    }

    protected clientJoined(client: ClientInfo): Delta<TServerState> | undefined { return undefined; }
    protected clientQuit(client: ClientInfo): Delta<TServerState> | undefined { return undefined; }

    protected abstract receiveCommandFromClient(client: ClientInfo, command: TClientToServerCommand): Delta<TServerState> | undefined;

    protected sendCommand(client: ClientInfo | undefined, command: TServerToClientCommand) {
        this.sendMessage({
            type: ServerWorkerMessageOutType.Command,
            who: client.id,
            command,
        });
    }

    protected stop(message: string = 'This server has stopped') {
        this.sendMessage({
            type: ServerWorkerMessageOutType.Disconnect,
            message,
        });
    }
}
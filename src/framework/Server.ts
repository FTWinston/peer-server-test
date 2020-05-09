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
                    name: message.who
                };

                const joinError = this.getJoinError(info);

                if (joinError !== null) {
                    this.sendMessage({
                        type: ServerWorkerMessageOutType.Disconnect,
                        who: info.name,
                        message: joinError,
                    });
                    break;
                }
                
                this._clients.set(info.name, info);
                this.sendPlayerList();
                this.updateState(this.clientJoined(info));
                break;
            }

            case ServerWorkerMessageInType.Quit: {
                const client = this._clients.get(message.who);
                this.sendPlayerList();
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
        if (stateDelta === undefined || Object.keys(stateDelta).length === 0) {
            return;
        }

        const newState = { ...this._state };

        applyDelta(newState, stateDelta);

        this._state = newState;

        this.stateChanged(newState);
    }

    protected stateChanged(delta: Delta<TServerState>) {
        this.sendDeltaStateToAll(delta);
    }

    private sendFullStateToAll(state: TServerState) {    
        for (const [_, client] of this._clients) {
            this.sendMessage({
                type: ServerWorkerMessageOutType.FullState,
                who: client.name,
                time: 0,
                state: this.getFullStateToSendClient(client, state),
            });
        }
    }

    private sendDeltaStateToAll(delta: Delta<TServerState>) {    
        for (const [_, client] of this._clients) {
            this.sendMessage({
                type: ServerWorkerMessageOutType.DeltaState,
                who: client.name,
                time: 0,       
                state: this.getDeltaStateToSendClient(client, delta, this.state),
            });
        }
    }
    
    protected abstract getFullStateToSendClient(client: ClientInfo, serverState: TServerState): TClientState;

    protected abstract getDeltaStateToSendClient(client: ClientInfo, serverDelta: Delta<TServerState>, fullState: TServerState): Delta<TClientState>;

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

    private sendPlayerList() {
        const players = [...this.clients.values()].map(c => c.name);
        
        this.sendMessage({
            type: ServerWorkerMessageOutType.Players,
            players,
        });
    }

    protected clientJoined(client: ClientInfo): Delta<TServerState> | undefined { return undefined; }
    protected clientQuit(client: ClientInfo): Delta<TServerState> | undefined { return undefined; }

    protected abstract receiveCommandFromClient(client: ClientInfo, command: TClientToServerCommand): Delta<TServerState> | undefined;

    protected sendCommand(client: ClientInfo | undefined, command: TServerToClientCommand) {
        this.sendMessage({
            type: ServerWorkerMessageOutType.Command,
            who: client?.name,
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
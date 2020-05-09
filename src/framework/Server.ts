import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import { Delta, applyDelta } from './Delta';

export abstract class Server<TServerState extends {}, TClientState extends {}, TClientToServerCommand, TServerToClientCommand> {
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
                const joinError = this.getJoinError(message.who);

                if (joinError !== null) {
                    this.sendMessage({
                        type: ServerWorkerMessageOutType.Disconnect,
                        who: message.who,
                        message: joinError,
                    });
                    break;
                }
                
                if (process.env.NODE_ENV === 'development') {
                    console.log(`${message.who} joined`);
                }

                this.addClient(message.who);
                this.updateState(this.clientJoined(message.who));
                break;
            }

            case ServerWorkerMessageInType.Quit: {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`${message.who} quit`);
                }

                if (this.removeClient(message.who)) {
                    this.updateState(this.clientQuit(message.who));
                }
                break;
            }

            case ServerWorkerMessageInType.Command: {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`${message.who} issued a command`, message.command);
                }
                this.updateState(this.receiveCommandFromClient(message.who, message.command));
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

    protected abstract stateChanged(delta: Delta<TServerState>): void;
    
    protected abstract getFullStateToSendClient(client: string, serverState: TServerState): TClientState;

    protected abstract getDeltaStateToSendClient(client: string, serverDelta: Delta<TServerState>, fullState: TServerState): Delta<TClientState>;

    protected abstract isNameInUse(name: string): boolean;

    protected getJoinError(clientName: string): string | null {
        if (clientName.length > 50) {
            return 'Your name is too long';
        }

        if (this.isNameInUse(clientName)) {
            return 'Your name is already in use';
        }

        return null;
    }

    protected abstract addClient(name: string): void;

    protected abstract removeClient(name: string): boolean;

    protected clientJoined(client: string): Delta<TServerState> | undefined { return undefined; }

    protected clientQuit(client: string): Delta<TServerState> | undefined { return undefined; }

    protected abstract receiveCommandFromClient(client: string, command: TClientToServerCommand): Delta<TServerState> | undefined;

    protected sendCommand(client: string | undefined, command: TServerToClientCommand) {
        this.sendMessage({
            type: ServerWorkerMessageOutType.Command,
            who: client,
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
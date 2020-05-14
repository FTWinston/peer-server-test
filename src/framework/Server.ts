import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import { enablePatches, Draft } from 'immer';

enablePatches();

export abstract class Server<
    TServerState extends {},
    TClientState extends {},
    TClientToServerCommand,
    TServerToClientCommand
> {
    constructor(
        protected readonly sendMessage: (message: ServerWorkerMessageOut<TServerToClientCommand, TClientState>) => void
    ) {
        sendMessage({
            type: ServerWorkerMessageOutType.Ready,
        });
    }

    protected abstract get clients(): IterableIterator<string>;

    protected abstract get state(): Readonly<TServerState>;

    protected abstract updateState(update: (state: Draft<TServerState>) => void): void;

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
                this.clientJoined(message.who);
                break;
            }

            case ServerWorkerMessageInType.Quit: {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`${message.who} quit`);
                }

                if (this.removeClient(message.who)) {
                    this.clientQuit(message.who);
                }
                break;
            }

            case ServerWorkerMessageInType.Command: {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`${message.who} issued a command`, message.command);
                }
                this.receiveCommandFromClient(message.who, message.command);
                break;
            }

            default:
                console.log('worker received unrecognised message', message);
                break;
        }
    }

    protected abstract updateClientState(client: string, clientState: Partial<Draft<TClientState>>, prevServerState: TServerState | null, serverState: TServerState): void;

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

    protected abstract addClient(client: string): void;

    protected abstract removeClient(client: string): boolean;

    protected clientJoined(client: string) {  }

    protected clientQuit(client: string) {  }

    protected abstract receiveCommandFromClient(client: string, command: TClientToServerCommand): void;

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
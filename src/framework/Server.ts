import {
    ServerWorkerMessageIn,
    ServerWorkerMessageInType,
} from './ServerWorkerMessageIn';
import {
    ServerWorkerMessageOut,
    ServerWorkerMessageOutType,
} from './ServerWorkerMessageOut';
import { FieldMappings, multiFilter } from 'filter-mirror';

export abstract class Server<
    TServerState extends {},
    TClientState extends {},
    TClientToServerCommand,
    TServerToClientCommand
> {
    constructor(
        initialState: TServerState,
        protected readonly sendMessage: (
            message: ServerWorkerMessageOut<
                TServerToClientCommand,
                TClientState
            >
        ) => void
    ) {
        sendMessage({
            type: ServerWorkerMessageOutType.Ready,
        });

        const {
            proxy,
            createMirror,
            removeMirror,
            substituteMirror,
        } = multiFilter<TServerState, TClientState, string>(
            initialState,
            (client) => this.mapClientState(client)
        );

        this._state = proxy;
        this.createClientState = createMirror;
        this.removeClientState = removeMirror;
        this.substituteClientState = substituteMirror;
    }

    private readonly createClientState: (client: string) => TClientState;

    private readonly removeClientState: (client: string) => void;

    protected readonly substituteClientState: (
        client: string,
        state: TClientState
    ) => void;

    private _state: TServerState;

    public get state(): Readonly<TServerState> {
        return this.state;
    }

    protected updateState(update: (state: TServerState) => void) {
        update(this._state);
    }

    protected abstract get clients(): IterableIterator<string>;

    public receiveMessage(
        message: ServerWorkerMessageIn<TClientToServerCommand>
    ) {
        const client = message.who;

        switch (message.type) {
            case ServerWorkerMessageInType.Join: {
                const joinError = this.getJoinError(client);

                if (joinError !== null) {
                    this.sendMessage({
                        type: ServerWorkerMessageOutType.Disconnect,
                        who: client,
                        message: joinError,
                    });
                    break;
                }

                if (process.env.NODE_ENV === 'development') {
                    console.log(`${client} joined`);
                }

                const substituteState = (newState: TClientState) =>
                    this.substituteClientState(client, newState);

                this.addClient(
                    client,
                    this.createClientState(client),
                    substituteState
                );
                this.clientJoined(client);
                break;
            }

            case ServerWorkerMessageInType.Quit: {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`${client} quit`);
                }

                if (this.removeClient(client)) {
                    this.removeClientState(client);
                    this.clientQuit(client);
                }
                break;
            }

            case ServerWorkerMessageInType.Command: {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`${client} issued a command`, message.command);
                }
                this.receiveCommandFromClient(client, message.command);
                break;
            }

            default:
                console.log('worker received unrecognised message', message);
                break;
        }
    }

    protected abstract mapClientState(
        client: string
    ): FieldMappings<TServerState, TClientState>;

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

    protected abstract addClient(
        client: string,
        state: TClientState,
        substituteState: (newState: TClientState) => void
    ): void;

    protected abstract removeClient(client: string): boolean;

    protected clientJoined(client: string) {}

    protected clientQuit(client: string) {}

    protected abstract receiveCommandFromClient(
        client: string,
        command: TClientToServerCommand
    ): void;

    protected sendCommand(
        client: string | undefined,
        command: TServerToClientCommand
    ) {
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

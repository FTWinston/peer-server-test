import {
    ServerWorkerMessageIn,
    ServerWorkerMessageInType,
} from './ServerWorkerMessageIn';
import {
    ServerWorkerMessageOut,
    ServerWorkerMessageOutType,
} from './ServerWorkerMessageOut';
import { FieldMappings, multiFilter, PatchOperation } from 'filter-mirror';
import { ClientStateManager } from './ClientStateManager';

export type RecursiveReadonly<T> = {
    readonly [P in keyof T]: RecursiveReadonly<T[P]>;
}

export abstract class Server<
    TServerState extends {},
    TClientState extends {},
    TClientCommand,
    TServerEvent,
    TClientStateManager extends ClientStateManager<
        TClientState,
        TServerEvent
    >
> {
    constructor(
        initialState: TServerState,
        protected readonly sendMessage: (
            message: ServerWorkerMessageOut<TServerEvent>
        ) => void
    ) {
        sendMessage({
            type: ServerWorkerMessageOutType.Ready,
        });

        const { proxy, createMirror, removeMirror } = multiFilter<
            TServerState,
            TClientState,
            string
        >(initialState, (client) => this.mapClientState(client));

        this._state = proxy;
        this.createClientState = createMirror;
        this.removeClientState = removeMirror;
    }

    private readonly createClientState: (
        client: string,
        patchCallback: (patch: PatchOperation) => void
    ) => TClientState;

    private readonly removeClientState: (client: string) => void;

    protected readonly substituteClientState: (
        client: string,
        state: TClientState
    ) => void;

    private _state: TServerState;

    public get state(): RecursiveReadonly<TServerState> {
        return this._state;
    }

    protected updateState(update: (state: TServerState) => void) {
        update(this._state);
    }

    private readonly _clients = new Map<string, TClientStateManager>();

    public get clients(): ReadonlyMap<string, TClientStateManager> {
        return this._clients;
    }

    public receiveMessage(
        message: ServerWorkerMessageIn<TClientCommand>
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

                this.clientJoined(client);

                const clientManager = this.createClient(client, (callback) =>
                    this.createClientState(client, callback)
                );
                this._clients.set(client, clientManager);

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

    protected isNameInUse(name: string) {
        return this.clients.has(name);
    }

    protected getJoinError(clientName: string): string | null {
        if (clientName.length > 50) {
            return 'Your name is too long';
        }

        if (this.isNameInUse(clientName)) {
            return 'Your name is already in use';
        }

        return null;
    }

    protected abstract createClient(
        client: string,
        createState: (
            patchCallback: (patch: PatchOperation) => void
        ) => TClientState
    ): TClientStateManager;

    protected removeClient(name: string) {
        return this._clients.delete(name);
    }

    protected clientJoined(client: string) {}

    protected clientQuit(client: string) {}

    protected abstract receiveCommandFromClient(
        client: string,
        command: TClientCommand
    ): void;

    protected sendEvent(
        client: string | undefined,
        event: TServerEvent
    ) {
        this.sendMessage({
            type: ServerWorkerMessageOutType.Event,
            who: client,
            event,
        });
    }

    protected stop(message: string = 'This server has stopped') {
        this.sendMessage({
            type: ServerWorkerMessageOutType.Disconnect,
            message,
        });
    }
}

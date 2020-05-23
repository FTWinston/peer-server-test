import { Server } from './Server';
import {
    ServerWorkerMessageOut,
    ServerWorkerMessageOutType,
} from './ServerWorkerMessageOut';
import {
    ServerWorkerMessageIn,
    ServerWorkerMessageInType,
} from './ServerWorkerMessageIn';
import { UnreliableClientStateManager } from './UnreliableClientStateManager';

export abstract class SimulatingServer<
    TServerState extends {},
    TClientState extends {},
    TClientToServerCommand,
    TServerToClientCommand
> extends Server<
    TServerState,
    TClientState,
    TClientToServerCommand,
    TServerToClientCommand
> {
    private readonly _clients = new Map<
        string,
        UnreliableClientStateManager<TClientState, TServerToClientCommand>
    >();

    private tickTimer: NodeJS.Timeout | undefined;
    private lastTickTime: number;

    constructor(
        initialState: TServerState,
        sendMessage: (
            message: ServerWorkerMessageOut<
                TServerToClientCommand,
                TClientState
            >
        ) => void,
        private readonly tickInterval: number
    ) {
        super(initialState, sendMessage);

        this.resume();
    }

    public get clients() {
        return this._clients.keys();
    }

    // TODO: status? e.g. not started, active, paused, finished
    public get isRunning() {
        return this.tickInterval !== undefined;
    }

    public pause() {
        if (this.tickTimer === undefined) {
            return;
        }

        clearInterval(this.tickTimer);
        this.tickTimer = undefined;
    }

    public resume() {
        if (this.tickTimer !== undefined) {
            return;
        }

        this.lastTickTime = performance.now() - this.tickInterval;
        this.tickTimer = setInterval(() => this.tick(), this.tickInterval);
    }

    protected isNameInUse(name: string) {
        return this._clients.has(name);
    }

    protected addClient(
        client: string,
        state: TClientState,
        substituteState: (newState: TClientState) => void
    ) {
        // Now that client has established a reliable connection, instruct them
        // to also connect unreliably, for use with sending state updates every tick.
        this.sendMessage({
            type: ServerWorkerMessageOutType.Control,
            who: client,
            operation: 'simulate',
        });

        this._clients.set(
            client,
            new UnreliableClientStateManager<
                TClientState,
                TServerToClientCommand
            >(client, state, this.sendMessage, substituteState)
        );
    }

    protected removeClient(client: string) {
        return this._clients.delete(client);
    }

    public receiveMessage(
        message: ServerWorkerMessageIn<TClientToServerCommand>
    ) {
        switch (message.type) {
            case ServerWorkerMessageInType.Acknowledge:
                const client = this._clients.get(message.who);
                client?.acknowledge(message.time);
                break;

            default:
                super.receiveMessage(message);
                break;
        }
    }

    private tick() {
        const tickStart = performance.now();
        const tickDuration = tickStart - this.lastTickTime;
        this.lastTickTime = tickStart;

        this.simulateTick(tickDuration);

        const sendTime = Math.round(tickStart);
        for (const [_, stateManager] of this._clients) {
            stateManager.sendState(sendTime);
        }
    }

    protected stop(message: string = 'This server has stopped') {
        this.pause();
        super.stop(message);
    }

    protected abstract simulateTick(timestep: number): void;
}

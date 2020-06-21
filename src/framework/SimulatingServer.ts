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
import { PatchOperation } from 'filter-mirror';

export abstract class SimulatingServer<
    TServerState extends {},
    TClientState extends {},
    TClientToServerCommand,
    TEvent
> extends Server<
    TServerState,
    TClientState,
    TClientToServerCommand,
    TEvent,
    UnreliableClientStateManager<TClientState, TEvent>
> {
    private tickTimer: NodeJS.Timeout | undefined;
    private lastTickTime: number;

    constructor(
        initialState: TServerState,
        sendMessage: (
            message: ServerWorkerMessageOut<TEvent>
        ) => void,
        private readonly tickInterval: number
    ) {
        super(initialState, sendMessage);

        this.resume();
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

    protected createClient(
        client: string,
        createState: (
            patchCallback: (patch: PatchOperation) => void
        ) => TClientState
    ) {
        // Now that client has established a reliable connection, instruct them
        // to also connect unreliably, for use with sending state updates every tick.
        this.sendMessage({
            type: ServerWorkerMessageOutType.Control,
            who: client,
            operation: 'simulate',
        });

        const clientManager = new UnreliableClientStateManager<
            TClientState,
            TEvent
        >(client, createState, this.sendMessage);

        return clientManager;
    }

    public receiveMessage(
        message: ServerWorkerMessageIn<TClientToServerCommand>
    ) {
        switch (message.type) {
            case ServerWorkerMessageInType.Acknowledge:
                const client = this.clients.get(message.who);
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
        for (const [_, stateManager] of this.clients) {
            stateManager.sendState(sendTime);
        }
    }

    protected stop(message: string = 'This server has stopped') {
        this.pause();
        super.stop(message);
    }

    protected abstract simulateTick(timestep: number): void;
}

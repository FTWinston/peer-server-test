import { Server } from './Server';
import { Delta } from './Delta';
import { ServerWorkerMessageOut } from './ServerWorkerMessageOut';

export abstract class TickingServer<TServerState extends {}, TClientState extends {}, TClientToServerCommand, TServerToClientCommand> 
    extends Server<TServerState, TClientState, TClientToServerCommand, TServerToClientCommand>
{
    private tickTimer: NodeJS.Timeout | undefined;
    private lastTickTime: number;

    constructor(
        initialState: TServerState,
        sendMessage: (message: ServerWorkerMessageOut<TServerToClientCommand, TClientState>) => void,
        private readonly tickInterval: number
    ) {
        super(initialState, sendMessage);
        this.resume();
    }

    // TODO: status? e.g. not started, active, paused, finished
    public get isRunning() { return this.tickInterval !== undefined; }

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

    private tick() {
        const tickStart = performance.now();
        const tickDuration = tickStart - this.lastTickTime;
        this.lastTickTime = tickStart;

        console.log(`server is ticking`, tickStart);

        this.updateState(this.simulateTick(tickDuration));
    }

    protected abstract simulateTick(timestep: number): Delta<TServerState> | undefined;
}
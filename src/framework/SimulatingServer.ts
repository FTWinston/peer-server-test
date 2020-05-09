import { Server } from './Server';
import { ClientStateManager } from './ClientStateManager';
import { Delta, applyDelta } from './Delta';
import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';

export abstract class SimulatingServer<TServerState extends {}, TClientState extends {}, TClientToServerCommand, TServerToClientCommand> 
    extends Server<TServerState, TClientState, TClientToServerCommand, TServerToClientCommand>
{
    private readonly clientData = new Map<string, ClientStateManager<TClientState, TServerToClientCommand>>();

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
    
    protected isNameInUse(name: string) {
        return this.clientData.has(name);
    }
    
    protected addClient(client: string) {
        // Now that client has established a reliable connection, instruct them
        // to also connect unreliably, for use with sending state updates every tick.
        this.sendMessage({
            type: ServerWorkerMessageOutType.Control,
            who: client,
            operation: 'simulate',
        });

        this.clientData.set(
            client,
            new ClientStateManager<TClientState, TServerToClientCommand>(
                client,
                this.sendMessage
            )
        );
    }

    protected removeClient(client: string) { 
        return this.clientData.delete(client);
    }

    public receiveMessage(message: ServerWorkerMessageIn<TClientToServerCommand>) {
        switch (message.type) {
            case ServerWorkerMessageInType.Acknowledge:
                const client = this.clientData.get(message.who);
                client?.acknowledge(message.time);
                break;

            default:
                super.receiveMessage(message);
                break;
        }
    }

    private tickDelta: Partial<Delta<TServerState>> = {};

    protected stateChanged(delta: Delta<TServerState>) {
        // Don't send state change immediately.
        // Instead, add this delta into an accumulating delta for the whole tick.
        applyDelta(this.tickDelta, delta);
    }
    
    private sendDeltaStateToAll(delta: Delta<TServerState>, time: number) {
        for (const [_, client] of this.clientData) {
            this.sendState(client, delta, time);
        }
    }

    private sendState(client: ClientStateManager<TClientState, TServerToClientCommand>, stateDelta: Delta<TServerState>, time: number) {
        if (client.shouldSendFullState(time)) {
            const clientState = this.getFullStateToSendClient(client.name, this.state);
            client.sendFullState(time, clientState);
        }
        else {
            const clientDelta = this.getDeltaStateToSendClient(client.name, stateDelta, this.state);
            client.sendDeltaState(time, clientDelta);
        }
    }

    private tick() {
        const tickStart = performance.now();
        const tickDuration = tickStart - this.lastTickTime;
        this.lastTickTime = tickStart;

        const simulationDelta = this.simulateTick(tickDuration);
        this.updateState(simulationDelta);

        // Send the accumulation of all state changes this tick, not just the simulationChange.
        this.sendDeltaStateToAll(this.tickDelta, tickStart);
        this.tickDelta = {};
    }

    protected stop(message: string = 'This server has stopped') {
        this.pause();
        super.stop(message);
    }

    protected abstract simulateTick(timestep: number): Delta<TServerState> | undefined;
}
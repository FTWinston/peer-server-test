import { Server } from './Server';
import { ClientStateManager } from './ClientStateManager';
import { Delta } from './Delta';
import { ServerWorkerMessageOut } from './ServerWorkerMessageOut';
import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { ClientInfo } from './ClientInfo';

export abstract class TickingServer<TServerState extends {}, TClientState extends {}, TClientToServerCommand, TServerToClientCommand> 
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
    
    protected clientJoined(client: ClientInfo): Delta<TServerState> | undefined {
        // TODO: now send the client a "simulate" command that instructs them to connect again
        // in a non-reliable way, and wait for that before counting them as fully "connected."

        // Then always use the non-reliable connection for sending state updates.

        this.clientData.set(
            client.id,
            new ClientStateManager<TClientState, TServerToClientCommand>(
                client,
                this.sendMessage
            )
        );
        return undefined;
    }

    protected clientQuit(client: ClientInfo): Delta<TServerState> | undefined { 
        this.clientData.delete(client.id);
        return undefined;
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

    private tick() {
        const tickStart = performance.now();
        const tickDuration = tickStart - this.lastTickTime;
        this.lastTickTime = tickStart;

        console.log(`server is ticking`, Math.round(tickStart));

        const stateDelta = this.simulateTick(tickDuration);
        this.updateState(stateDelta);

        // TODO: the problem here is that even if we get the state delta from this tick simulation,
        // it won't include any state delta from e.g. client commands that ran since the last tick.
        // How do we best work around that?

        const time = Math.round(performance.now()); // ms since the page was opened
        for (const [_, client] of this.clientData) {
            this.sendState(client, stateDelta, time);
        }
    }

    protected stop(message: string = 'This server has stopped') {
        this.pause();
        super.stop(message);
    }

    protected abstract simulateTick(timestep: number): Delta<TServerState> | undefined;

    private sendState(client: ClientStateManager<TClientState, TServerToClientCommand>, stateDelta: Delta<TServerState>, time: number) {
        if (client.shouldSendFullState(time)) {
            const clientState = this.getFullStateToSendClient(client.info, this.state);
            client.sendFullState(time, clientState);
        }
        else {
            const clientDelta = this.getDeltaStateToSendClient(client.info, stateDelta, this.state);
            client.sendDeltaState(time, clientDelta);
        }
    }

    protected abstract getFullStateToSendClient(client: ClientInfo, serverState: TServerState): TClientState;

    protected abstract getDeltaStateToSendClient(client: ClientInfo, serverDelta: Delta<TServerState>, fullState: TServerState): Delta<TClientState>;
}
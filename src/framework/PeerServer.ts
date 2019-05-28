import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';

export abstract class PeerServer<TClientToServerCommand, TServerToClientCommand, TServerState>
{
    private readonly tickTimer: NodeJS.Timeout;
    
    protected readonly sendMessage: (message: ServerWorkerMessageOut<TServerToClientCommand, TServerState>) => void;

    protected readonly clients: string[] = [];

    protected serverState: TServerState;

    private lastTickTime: number;

    constructor(worker: Worker, tickInterval: number) {
        this.sendMessage = message => worker.postMessage(message);

        worker.onmessage = e => this.receiveMessage(e.data);

        this.lastTickTime = performance.now() - tickInterval;
        this.tickTimer = setInterval(() => this.tick(), tickInterval);
    }

    public receiveMessage(message: ServerWorkerMessageIn<TClientToServerCommand>) {
        switch (message.type) {
            case ServerWorkerMessageInType.Join:
                this.clients.push(message.who);
                this.clientJoined(message.who);
                break;
            case ServerWorkerMessageInType.Quit:
                const pos = this.clients.indexOf(message.who);
                if (pos !== -1) {
                    this.clients.splice(pos, 1);
                    this.clientQuit(message.who);
                }
                break;
            case ServerWorkerMessageInType.Command:
                console.log(`${message.who} issued a command`, message.command);
                this.receiveCommandFromClient(message.who, message.command);
                break;
            default:
                console.log('worker received unrecognised message', message);
                break;
        }
    }

    protected clientJoined(who: string) {}
    protected clientQuit(who: string) {}

    protected abstract receiveCommandFromClient(who: string, command: TClientToServerCommand): void;

    private tick() {
        const tickStart = performance.now();
        const tickDuration = tickStart - this.lastTickTime;
        this.lastTickTime = tickStart;

        console.log(`server is ticking`);

        this.simulateTick(tickDuration);

        // TODO: send state delta to every client, not always full state

        for (const client of this.clients) {
            this.sendMessage({
                type: ServerWorkerMessageOutType.State,
                who: client,
                state: this.getStateToSendClient(client),
            });
        }
    }

    protected abstract simulateTick(timestep: number): void;

    protected abstract getStateToSendClient(who: string): TServerState;
}
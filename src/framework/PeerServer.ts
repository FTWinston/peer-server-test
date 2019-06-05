import { ServerWorkerMessageIn, ServerWorkerMessageInType } from './ServerWorkerMessageIn';
import { ServerWorkerMessageOut, ServerWorkerMessageOutType } from './ServerWorkerMessageOut';
import { IEntity } from './IEntity';
import { Client } from './Client';

type ClientSendState<TClientEntity> {
    [key: number]: TClientEntity[]
}

export abstract class PeerServer<TClientToServerCommand, TServerToClientCommand, TClientEntity extends IEntity>
{
    private tickTimer: NodeJS.Timeout | undefined;
    
    private readonly sendMessage: (message: ServerWorkerMessageOut<TServerToClientCommand, TClientEntity>) => void;

    protected readonly clients: string[] = [];
    private readonly clientData: {[key:string]: Client<TClientEntity>} = {};

    private lastTickTime: number;

    constructor(worker: Worker, private readonly tickInterval: number) {
        this.sendMessage = message => worker.postMessage(message);

        worker.onmessage = e => this.receiveMessage(e.data);

        this.resume();
    }

    // TODO: state? e.g. not started, active, paused, finished
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

    public receiveMessage(message: ServerWorkerMessageIn<TClientToServerCommand>) {
        switch (message.type) {
            case ServerWorkerMessageInType.Join:
                this.clientData[message.who] = new Client<TClientEntity>();
                this.clients.push(message.who);
                this.clientJoined(message.who);
                break;
            case ServerWorkerMessageInType.Quit:
            delete this.clientData[message.who];
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

    protected sendCommand(client: string | undefined, command: TServerToClientCommand) {
        this.sendMessage({
            type: ServerWorkerMessageOutType.Command,
            who: client,
            command,
        });
    }

    protected abstract simulateTick(timestep: number): void;

    protected abstract getStateToSendClient(who: string): TClientEntity[];
}
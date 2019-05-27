import { ServerMessageIn, ServerMessageInType } from '../shared/ServerMessageIn';
import { ServerMessageOut, ServerMessageOutType } from '../shared/ServerMessageOut';

const tickInterval = 500; // this many milliseconds between each server tick

export class PeerServer
{
    private tickTimer: NodeJS.Timeout;

    private readonly clients: string[] = [];

    constructor(private readonly sendMessage: (message: ServerMessageOut) => void) {
        this.tickTimer = setInterval(() => this.tick(), tickInterval);
    }

    public receiveMessage(message: ServerMessageIn) {
        switch (message.type) {
            case ServerMessageInType.Join:
                console.log(`${message.who} connected`);
                this.clients.push(message.who);
                break;
            case ServerMessageInType.Quit:
                console.log(`${message.who} disconnected`);
                const pos = this.clients.indexOf(message.who);
                if (pos !== -1) {
                    this.clients.splice(pos, 1);
                }
                break;
            case ServerMessageInType.Command:
                console.log(`${message.who} issued a command`, message.command);
                break;
            default:
                console.log('worker received unrecognised message', message);
                break;
        }
    }

    private tick() {
        console.log(`server is ticking`);

        // TODO: simulate stuff

        // TODO: send state delta to every client, not always full state

        for (const client of this.clients) {
            this.sendMessage({
                type: ServerMessageOutType.State,
                who: client,
                state: this.getStateToSendClient(client),
            });
        }
    }

    getStateToSendClient(client: string): any {
        // TODO: something here
        return {};
    }
}
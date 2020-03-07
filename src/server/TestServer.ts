import { ClientToServerCommand } from '../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../shared/ServerToClientCommand';
import { ServerState } from './ServerState';
import { Player } from '../shared/ClientState';
import { TickingServer } from '../framework/TickingServer';
import { Delta } from '../framework/Delta';
import { ServerWorkerMessageOut } from '../framework/ServerWorkerMessageOut';
import { ClientInfo } from '../framework/ClientInfo';

const tickInterval = 500; // this many milliseconds between each server tick

export class TestServer extends TickingServer<ServerState, ServerState, ClientToServerCommand, ServerToClientCommand>
{
    constructor(
        sendMessage: (message: ServerWorkerMessageOut<ServerToClientCommand, ServerState>) => void
    ) {
        super({}, sendMessage, tickInterval);
    }

    private playersByClientName = new Map<string, Player>();

    protected clientJoined(client: ClientInfo): Delta<ServerState> | undefined {
        console.log(`${client.name} connected`);

        const player: Player = {
            type: 'player',
            name: client.name,
            x: 0,
            y: 0,
        }

        this.playersByClientName.set(client.name, player);

        return {
            [client.name]: player
        };
    }

    protected clientQuit(client: ClientInfo): Delta<ServerState> | undefined {
        console.log(`${client.name} disconnected`);

        const playerId = this.playersByClientName.get(client.name);
        this.playersByClientName.delete(client.name);

        return {
            [client.name]: undefined
        };
    }

    public receiveCommandFromClient(client: ClientInfo, command: ClientToServerCommand): Delta<ServerState> | undefined {
        switch (command) {
            case 'left': {
                console.log(`${client.name} moved left`);

                const player = this.playersByClientName.get(client.id);
                if (player !== undefined) {
                    player.x--;
                    
                    return {
                        [client.name]: {
                            x: player.x,
                        }
                    }
                }
            }
            case 'right': {
                console.log(`${client.name} moved right`);

                const player = this.playersByClientName.get(client.name);
                if (player !== undefined) {
                    player.x++;

                    return {
                        [client.name]: {
                            x: player.x,
                        }
                    }
                }
            }
            default: {
                console.log(`${client.name} issued unhandled command`, command);
            }
        }

        return undefined;
    }

    protected simulateTick(timestep: number): Delta<ServerState> | undefined {
        // TODO: simulate stuff
        return undefined;
    }

    protected getFullStateToSendClient(client: ClientInfo, serverState: ServerState): ServerState {
        // TODO: some filtering here?
        return serverState;
    }

    protected getDeltaStateToSendClient(client: ClientInfo, serverDelta: Delta<ServerState>): Delta<ServerState> {
        // TODO: some filtering here?
        return serverDelta;
    }
}
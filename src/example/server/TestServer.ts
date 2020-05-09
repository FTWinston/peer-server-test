import { ClientToServerCommand } from '../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../shared/ServerToClientCommand';
import { ServerState } from './ServerState';
import { Player } from '../shared/ClientState';
import { SimulatingServer } from '../../framework/SimulatingServer';
import { Delta } from '../../framework/Delta';
import { ServerWorkerMessageOut } from '../../framework/ServerWorkerMessageOut';

const tickInterval = 500; // this many milliseconds between each server tick

export class TestServer extends SimulatingServer<ServerState, ServerState, ClientToServerCommand, ServerToClientCommand>
{
    constructor(
        sendMessage: (message: ServerWorkerMessageOut<ServerToClientCommand, ServerState>) => void
    ) {
        super({}, sendMessage, tickInterval);
    }

    private playersByClientName = new Map<string, Player>();

    protected clientJoined(name: string): Delta<ServerState> | undefined {
        console.log(`${name} connected`);

        const player: Player = {
            type: 'player',
            name: name,
            x: 0,
            y: 0,
        }

        this.playersByClientName.set(name, player);

        return {
            [name]: player
        };
    }

    protected clientQuit(name: string): Delta<ServerState> | undefined {
        console.log(`${name} disconnected`);

        const playerId = this.playersByClientName.get(name);
        this.playersByClientName.delete(name);

        return {
            [name]: undefined
        };
    }

    public receiveCommandFromClient(name: string, command: ClientToServerCommand): Delta<ServerState> | undefined {
        switch (command) {
            case 'left': {
                console.log(`${name} moved left`);

                const player = this.playersByClientName.get(name);
                if (player !== undefined) {
                    player.x--;
                    
                    return {
                        [name]: {
                            x: player.x,
                        }
                    }
                }
                break;
            }
            case 'right': {
                console.log(`${name} moved right`);

                const player = this.playersByClientName.get(name);
                if (player !== undefined) {
                    player.x++;

                    return {
                        [name]: {
                            x: player.x,
                        }
                    }
                }
                break;
            }
            default: {
                console.log(`${name} issued unhandled command`, command);
                break;
            }
        }

        return undefined;
    }

    protected simulateTick(timestep: number): Delta<ServerState> | undefined {
        // TODO: simulate stuff
        return undefined;
    }

    protected getFullStateToSendClient(client: string, serverState: ServerState): ServerState {
        // TODO: some filtering here?
        return serverState;
    }

    protected getDeltaStateToSendClient(client: string, serverDelta: Delta<ServerState>): Delta<ServerState> {
        // TODO: some filtering here?
        return serverDelta;
    }
}
import { ClientToServerCommand } from '../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../shared/ServerToClientCommand';
import { ServerState } from './ServerState';
import { Player } from '../shared/ClientState';
import { TickingServer } from '../framework/TickingServer';
import { Delta } from '../framework/Delta';
import { ServerWorkerMessageOut } from '../framework/ServerWorkerMessageOut';

const tickInterval = 500; // this many milliseconds between each server tick

export class TestServer extends TickingServer<ServerState, ServerState, ClientToServerCommand, ServerToClientCommand>
{
    constructor(
        sendMessage: (message: ServerWorkerMessageOut<ServerToClientCommand, ServerState>) => void
    ) {
        super({}, sendMessage, tickInterval);
    }

    private playersByClientName = new Map<string, Player>();

    protected clientJoined(who: string): Delta<ServerState> | undefined {
        console.log(`${who} connected`);

        const player: Player = {
            type: 'player',
            name: who,
            x: 0,
            y: 0,
        }

        this.playersByClientName.set(who, player);

        return {
            [who]: player
        };
    }

    protected clientQuit(who: string): Delta<ServerState> | undefined {
        console.log(`${who} disconnected`);

        const playerId = this.playersByClientName.get(who);
        this.playersByClientName.delete(who);

        return {
            [who]: undefined
        };
    }

    public receiveCommandFromClient(who: string, command: ClientToServerCommand): Delta<ServerState> | undefined {
        switch (command) {
            case 'left': {
                console.log(`${who} moved left`);

                const player = this.playersByClientName.get(who);
                if (player !== undefined) {
                    player.x--;
                    
                    return {
                        [who]: {
                            x: player.x,
                        }
                    }
                }
            }
            case 'right': {
                console.log(`${who} moved right`);

                const player = this.playersByClientName.get(who);
                if (player !== undefined) {
                    player.x++;

                    return {
                        [who]: {
                            x: player.x,
                        }
                    }
                }
            }
            default: {
                console.log(`${who} issued unhandled command`, command);
            }
        }

        return undefined;
    }

    protected simulateTick(timestep: number): Delta<ServerState> | undefined {
        // TODO: simulate stuff
        return undefined;
    }

    protected getFullStateToSendClient(who: string, serverState: ServerState): ServerState {
        // TODO: some filtering here?
        return serverState;
    }

    protected getDeltaStateToSendClient(who: string, serverDelta: Delta<ServerState>): Delta<ServerState> {
        // TODO: some filtering here?
        return serverDelta;
    }
}
import { ClientToServerCommand } from '../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../shared/ServerToClientCommand';
import { ServerEntity } from './ServerState';
import { ClientEntity, Player } from '../shared/ClientState';
import { FullState, DeltaState } from '../framework/State';
import { TickingServer } from '../framework/TickingServer';

const tickInterval = 500; // this many milliseconds between each server tick

export class TestPeerServer extends TickingServer<ClientToServerCommand, ServerToClientCommand, ClientEntity>
{
    private readonly serverState: FullState<ServerEntity>;

    constructor(worker: Worker) {
        super(worker, tickInterval);
    }

    private playersByClientName = new Map<string, Player>();

    private nextId: number = 1;

    protected clientJoined(who: string) {
        console.log(`${who} connected`);

        const id = this.nextId++;

        const player: Player = {
            id,
            type: 'player',
            name: who,
            x: 0,
            y: 0,
        }

        this.playersByClientName.set(who, player);
        this.serverState[id] = player;
    }

    protected clientQuit(who: string) {
        console.log(`${who} disconnected`);

        const playerId = this.playersByClientName.get(who).id;
        this.playersByClientName.delete(who);
        delete this.serverState[playerId];
    }

    public receiveCommandFromClient(who: string, command: ClientToServerCommand) {
        switch (command) {
            case 'left': {
                console.log(`${who} moved left`);

                const player = this.playersByClientName.get(who);
                if (player !== undefined) {
                    player.x--;
                }
                break;
            }
            case 'right': {
                console.log(`${who} moved right`);

                const player = this.playersByClientName.get(who);
                if (player !== undefined) {
                    player.x++;
                }
                break;
            }
            default: {
                console.log(`${who} issued unhandled command`, command);
            }
        }
    }

    protected simulateTick(timestep: number) {
        // TODO: simulate stuff
    }

    protected getFullStateToSendClient(who: string): FullState<ClientEntity> {
        // TODO: some filtering here?
        return this.serverState;
    }

    protected getDeltaStateToSendClient(who: string): DeltaState<ClientEntity> {
        // TODO: DELTA, somehow
        return this.serverState;
    }
}
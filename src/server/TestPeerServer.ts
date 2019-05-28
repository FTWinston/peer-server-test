import { PeerServer } from '../framework/PeerServer';
import { ClientToServerCommand } from '../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../shared/ServerToClientCommand';
import { ServerState } from '../shared/ServerState';
import { ClientState } from '../shared/ClientState';

const tickInterval = 500; // this many milliseconds between each server tick

export class TestPeerServer extends PeerServer<ClientToServerCommand, ServerToClientCommand, ServerState, ClientState>
{
    constructor(worker: Worker) {
        super(worker, tickInterval);

        this.serverState = {
            active: false,
            players: [],
        };
    }

    protected clientJoined(who: string) {
        console.log(`${who} connected`);

        this.serverState.players.push({
            name: who,
            x: 0,
            y: 0,
        });
    }

    protected clientQuit(who: string) {
        console.log(`${who} disconnected`);

        const pos = this.serverState.players.findIndex(p => p.name === who);
        if (pos !== -1) {
            this.serverState.players.splice(pos, 1);
        }
    }

    public receiveCommandFromClient(who: string, command: ClientToServerCommand) {
        switch (command) {
            case 'left': {
                console.log(`${who} moved left`);

                const player = this.serverState.players.find(p => p.name === who);
                if (player !== undefined) {
                    player.x--;
                }
                break;
            }
            case 'right': {
                console.log(`${who} moved right`);

                const player = this.serverState.players.find(p => p.name === who);
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

    protected getStateToSendClient(who: string): ServerState {
        // TODO: some filtering here?
        // TODO: DELTA state, not full state each time
        return this.serverState;
    }
}
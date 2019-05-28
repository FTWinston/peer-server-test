import { PeerServer } from '../framework/PeerServer';
import { ClientToServerCommand } from '../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../shared/ServerToClientCommand';
import { ServerState } from '../shared/ServerState';

const tickInterval = 500; // this many milliseconds between each server tick

export class TestPeerServer extends PeerServer<ClientToServerCommand, ServerToClientCommand, ServerState>
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
    }

    protected clientQuit(who: string) {
        console.log(`${who} disconnected`);
    }

    public receiveCommandFromClient(who: string, command: ClientToServerCommand) {
        console.log(`${who} issed a command`, command);
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
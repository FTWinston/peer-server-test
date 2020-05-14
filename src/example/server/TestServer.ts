import { ClientToServerCommand } from '../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../shared/ServerToClientCommand';
import { ServerState } from './ServerState';
import { Player, ClientState } from '../shared/ClientState';
import { SimulatingServer } from '../../framework/SimulatingServer';
import { ServerWorkerMessageOut } from '../../framework/ServerWorkerMessageOut';
import { Draft } from 'immer';

const tickInterval = 500; // this many milliseconds between each server tick

export class TestServer extends SimulatingServer<ServerState, ServerState, ClientToServerCommand, ServerToClientCommand>
{
    constructor(
        sendMessage: (message: ServerWorkerMessageOut<ServerToClientCommand, ServerState>) => void
    ) {
        super({
            rules: {
                active: true,
            },
            players: {},
        }, sendMessage, tickInterval);
    }

    protected clientJoined(name: string) {
        console.log(`${name} connected`);

        const player: Player = {
            x: 0,
            y: 0,
        }

        this.updateState(state => {
            state.players = {
                ...state.players,
                [name]: player,
            };
        });
    }

    protected clientQuit(name: string) {
        console.log(`${name} disconnected`);

        this.updateState(state => {
            state.players = {
                ...state.players,
            };
            delete state.players[name];
        });
    }

    public receiveCommandFromClient(name: string, command: ClientToServerCommand): void {
        switch (command) {
            case 'left': {
                console.log(`${name} moved left`);

                this.updateState(state => {
                    const player = state.players[name];
                    if (player !== undefined) {
                        player.x--;
                    }
                });
                break;
            }
            case 'right': {
                console.log(`${name} moved right`);

                this.updateState(state => {
                    const player = state.players[name];
                    if (player !== undefined) {
                        player.x++;
                    }
                });
                break;
            }
            default: {
                console.log(`${name} issued unhandled command`, command);
                break;
            }
        }
    }

    protected simulateTick(timestep: number): void {
        // TODO: simulate stuff
    }

    protected updateClientState(client: string, clientState: Partial<Draft<ClientState>>, prevServerState: ServerState | null, serverState: ServerState) {
        if (prevServerState?.rules !== serverState.rules) {
            clientState.rules = serverState.rules;
        }

        // TODO: only send the player(s) that changed
        if (prevServerState?.players !== serverState.players) {
            clientState.players = serverState.players;
        }
    }
}
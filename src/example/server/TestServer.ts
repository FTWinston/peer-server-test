import { ClientToServerCommand } from '../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../shared/ServerToClientCommand';
import { ServerState } from './ServerState';
import { Player, ClientState } from '../shared/ClientState';
import { SimulatingServer } from '../../framework/SimulatingServer';
import { ServerWorkerMessageOut } from '../../framework/ServerWorkerMessageOut';
import { FieldMappings, anyOtherFields } from 'filter-mirror';

const tickInterval = 500; // this many milliseconds between each server tick

export class TestServer extends SimulatingServer<
    ServerState,
    ServerState,
    ClientToServerCommand,
    ServerToClientCommand
> {
    constructor(
        sendMessage: (
            message: ServerWorkerMessageOut<ServerToClientCommand>
        ) => void
    ) {
        super(
            {
                rules: {
                    active: true,
                },
                players: {},
            },
            sendMessage,
            tickInterval
        );
    }

    protected clientJoined(name: string) {
        console.log(`${name} connected`);

        const player: Player = {
            x: 0,
            y: 0,
        };

        this.updateState((state) => {
            state.players[name] = player;
        });
    }

    protected clientQuit(name: string) {
        console.log(`${name} disconnected`);

        this.updateState((state) => {
            delete state.players[name];
        });
    }

    public receiveCommandFromClient(
        name: string,
        command: ClientToServerCommand
    ): void {
        switch (command) {
            case 'left': {
                console.log(`${name} moved left`);

                this.updateState((state) => {
                    const player = state.players[name];
                    if (player !== undefined) {
                        player.x--;
                    }
                });
                break;
            }
            case 'right': {
                console.log(`${name} moved right`);

                this.updateState((state) => {
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

    protected mapClientState(): FieldMappings<ServerState, ClientState> {
        return {
            rules: true,
            players: {
                [anyOtherFields]: true,
            },
        };
    }
}

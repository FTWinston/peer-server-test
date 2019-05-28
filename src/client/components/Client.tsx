import * as React from 'react';
import { ConnectionSelector, TypedConnection } from './ConnectionSelector';
import { ServerToClientCommand } from '../../shared/ServerToClientCommand';
import { ClientState } from '../../shared/ClientState';

interface IState {
    connection?: TypedConnection;
}

export class Client extends React.Component<{}, IState> {
    constructor(props: {}) {
        super(props);

        this.state = {};
    }

    render() {
        if (this.state.connection === undefined) {
            const commandReceived = (cmd: ServerToClientCommand) => this.commandReceived(cmd);
            const stateReceived = (state: ClientState) => this.stateReceived(state);

            const connectionSelected = (connection: TypedConnection) => {
                this.setState({ connection });

                connection.sendCommand('shoot');
            }

            return <ConnectionSelector
                connectionSelected={connectionSelected}
                receiveCommand={commandReceived}
                receiveState={stateReceived}
            />
        }

        return (
        <div>
            Connected to server {this.state.connection.getServerId()}

            <button onClick={() => this.state.connection!.sendCommand('left')}>left</button>
            <button onClick={() => this.state.connection!.sendCommand('right')}>right</button>
            <button onClick={() => this.state.connection!.sendCommand('shoot')}>shoot</button>
        </div>
        );
    }

    private commandReceived(cmd: ServerToClientCommand) {
        console.log('client received command', cmd);
    }

    private stateReceived(state: ClientState) {
        console.log('client received state', state);
    }
}
import * as React from 'react';
import { ConnectionSelector, TypedConnection } from './ConnectionSelector';
import { ServerToClientCommand } from '../../shared/ServerToClientCommand';
import { ClientState } from '../../shared/ClientState';

interface IState {
    connection?: TypedConnection;
}

let clientState: ClientState = {
    rules: {
        active: false
    }
};

export class Client extends React.Component<{}, IState> {
    constructor(props: {}) {
        super(props);

        this.state = {};
    }

    render() {
        if (this.state.connection === undefined) {
            const commandReceived = (cmd: ServerToClientCommand) => this.commandReceived(cmd);
            const stateReceived = (state: ClientState) => this.stateReceived(state);
            const getState = () => clientState;

            const connectionSelected = (connection: TypedConnection) => {
                this.setState({ connection });

                connection.sendCommand('shoot');
            }

            return <ConnectionSelector
                connectionSelected={connectionSelected}
                receiveCommand={commandReceived}
                receiveState={stateReceived}
                getExistingState={getState}
            />
        }

        return (
        <div>
            Connected to server

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
        clientState = state;
    }
}
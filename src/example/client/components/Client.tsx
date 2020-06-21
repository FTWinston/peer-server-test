import * as React from 'react';
import { ConnectionSelector, TypedConnection } from './ConnectionSelector';
import { ServerEvent } from '../../shared/ServerEvent';
import { ClientState } from '../../shared/ClientState';
import { useState } from 'react';

interface IState {
    connection?: TypedConnection;
}

let clientState: ClientState = {
    rules: {
        active: false,
    },
    players: {},
};

export const Client: React.FC = () => {
    const [connection, setConnection] = useState<TypedConnection>();
    const [state, setState] = useState<ClientState>(clientState);

    if (connection === undefined) {
        const stateReceived = (prevState: ClientState, state: ClientState) =>
            setState(state);

        const connectionSelected = (connection: TypedConnection) => {
            setConnection(connection);

            connection.sendCommand('shoot');
        };

        // TODO: expose the connection's state (or the connection itself, more likely)
        return (
            <ConnectionSelector
                connectionSelected={connectionSelected}
                receiveCommand={commandReceived}
                stateChanged={stateReceived}
            />
        );
    }

    const players: JSX.Element[] = [];

    for (const name in state.players) {
        players.push(
            <div
                key={name}
                style={{
                    left: state.players[name].x * 50,
                    margin: '2em 0',
                    position: 'relative',
                }}
            >
                {name}
            </div>
        );
    }

    return (
        <div>
            Connected to server
            <button onClick={() => connection!.sendCommand('left')}>
                left
            </button>
            <button onClick={() => connection!.sendCommand('right')}>
                right
            </button>
            <button onClick={() => connection!.sendCommand('shoot')}>
                shoot
            </button>
            {players}
        </div>
    );
};

function commandReceived(cmd: ServerEvent) {
    console.log('client received command', cmd);
}

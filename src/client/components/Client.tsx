import * as React from 'react';
import { Connection } from '../../framework/Connection';
import { ConnectionSelector } from './ConnectionSelector';
import { ClientToServerCommand } from '../../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../../shared/ServerToClientCommand';
import { ServerState } from '../../shared/ServerState';

interface IState {
    connection?: Connection<ClientToServerCommand, ServerToClientCommand, ServerState>;
}

export class Client extends React.Component<{}, IState> {
    constructor(props: {}) {
        super(props);

        this.state = {};
    }

    render() {
        if (this.state.connection === undefined) {
            const msgReceived = (data: any) => this.messageReceived(data);

            const connectionSelected = (connection: Connection<ClientToServerCommand, ServerToClientCommand, ServerState>) => {
                this.setState({ connection });

                connection.sendCommand('shoot');
            }

            return <ConnectionSelector
                connectionSelected={connectionSelected}
                receiveMessage={msgReceived}
            />
        }

        return (
        <div>
            Connected to server {this.state.connection.getServerId()}
        </div>
        );
    }

    private messageReceived(msg: any) {

    }
}

/*
import { LocalConnection } from '../LocalConnection';

const connection = new LocalConnection(data => {
    console.log('message received from worker', data)
});

connection.sendMessage('hullo');
*/
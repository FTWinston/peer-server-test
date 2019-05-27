import * as React from 'react';
import { Connection } from '../Connection';
import { ConnectionSelector } from './ConnectionSelector';

interface IState {
    connection?: Connection;
}

export class Client extends React.Component<{}, IState> {
    constructor(props: {}) {
        super(props);

        this.state = {};
    }

    render() {
        if (this.state.connection === undefined) {
            const msgReceived = (data: any) => this.messageReceived(data);

            const connectionSelected = (connection: Connection) => {
                this.setState({ connection });

                connection.sendCommand('hullo');
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
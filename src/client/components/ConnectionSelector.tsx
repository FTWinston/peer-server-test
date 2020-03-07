import React, { useState } from 'react';
import { Connection } from '../../framework/Connection';
import { RemoteConnection } from '../../framework/RemoteConnection';
import { ClientToServerCommand } from '../../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../../shared/ServerToClientCommand';
import { ClientState } from '../../shared/ClientState';
import ServerWorker from '../../server/worker';
import { LocalConnection } from '../../framework/LocalConnection';

export type TypedConnection = Connection<ClientToServerCommand, ServerToClientCommand, ClientState>;

interface IProps {
    receiveCommand: (cmd: ServerToClientCommand) => void;
    receiveState: (state: ClientState) => void;
    connectionSelected: (conn: TypedConnection) => void;
}

const clientName = 'TODO enter this';

export const ConnectionSelector = (props: IProps) => {
    let connection: TypedConnection;
    const ready = () => props.connectionSelected(connection);

    const selectLocal = () => {
        connection = new LocalConnection<ClientToServerCommand, ServerToClientCommand, ClientState>(
            {
                rules: {
                    active: false
                }
            },
            clientName,
            new ServerWorker(),
            cmd => props.receiveCommand(cmd),
            state => props.receiveState(state),
            msg => console.error(msg),
            ready
        );
    }
    
    const [serverId, setServerId] = useState('');

    const selectRemote = () => {
        connection = new RemoteConnection<ClientToServerCommand, ServerToClientCommand, ClientState>(
            {
                rules: {
                    active: false
                }
            },
            serverId,
            clientName,
            cmd => props.receiveCommand(cmd),
            state => props.receiveState(state),
            msg => console.error(msg),
            ready
        );
    }

    return (
    <div>
        <div>
            <button onClick={selectLocal}>Host a local server</button>
        </div>

        <div style={{marginTop: '2em'}}>
            <input
                type="text"
                placeholder="enter server ID"
                value={serverId}
                onChange={e => setServerId(e.target.value)}
            />
            <button 
                onClick={selectRemote}
                disabled={serverId.length === 0}
            >
                Join a remote server
            </button>
        </div>
    </div>
    );
}
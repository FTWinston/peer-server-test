import React, { useState } from 'react';
import { Connection } from '../../framework/Connection';
import { LocalConnection } from '../../framework/LocalConnection';
import { RemoteConnection } from '../../framework/RemoteConnection';
import { ClientToServerCommand } from '../../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../../shared/ServerToClientCommand';
import { ServerState } from '../../server/ServerState';
import { ClientState } from '../../shared/ClientState';

export type TypedConnection = Connection<ClientToServerCommand, ServerToClientCommand, ClientState>;

interface IProps {
    receiveCommand: (cmd: ServerToClientCommand) => void;
    receiveState: (state: ClientState) => void;
    connectionSelected: (conn: TypedConnection) => void;
}

export const ConnectionSelector = (props: IProps) => {
    let connection: TypedConnection;
    const ready = () => props.connectionSelected(connection);

    const selectLocal = () => {
        connection = new LocalConnection<ClientToServerCommand, ServerToClientCommand, ClientState>(
            cmd => props.receiveCommand(cmd),
            state => props.receiveState(state),
            ready
        );
    }

    
    const [serverId, setServerId] = useState('');

    const selectRemote = () => {
        connection = new RemoteConnection<ClientToServerCommand, ServerToClientCommand, ClientState>(
            serverId,
            cmd => props.receiveCommand(cmd),
            state => props.receiveState(state),
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
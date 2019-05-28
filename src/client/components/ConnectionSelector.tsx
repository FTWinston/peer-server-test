import React, { useState } from 'react';
import { Connection } from '../../framework/Connection';
import { LocalConnection } from '../../framework/LocalConnection';
import { RemoteConnection } from '../../framework/RemoteConnection';
import { ClientToServerCommand } from '../../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../../shared/ServerToClientCommand';
import { ServerState } from '../../shared/ServerState';

interface IProps {
    receiveMessage: (data: any) => void;
    connectionSelected: (conn: Connection<ClientToServerCommand, ServerToClientCommand, ServerState>) => void;
}

export const ConnectionSelector = (props: IProps) => {
    let connection: Connection<ClientToServerCommand, ServerToClientCommand, ServerState>;
    const ready = () => props.connectionSelected(connection);

    const selectLocal = () => {
        connection = new LocalConnection<ClientToServerCommand, ServerToClientCommand, ServerState>(data => props.receiveMessage(data), ready);
    }

    
    const [serverId, setServerId] = useState('');

    const selectRemote = () => {
        connection = new RemoteConnection<ClientToServerCommand, ServerToClientCommand, ServerState>(serverId, data => props.receiveMessage(data), ready);
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
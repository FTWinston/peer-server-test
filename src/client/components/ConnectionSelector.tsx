import React, { useState } from 'react';
import { Connection } from '../Connection';
import { LocalConnection } from '../LocalConnection';
import { RemoteConnection } from '../RemoteConnection';

interface IProps {
    receiveMessage: (data: any) => void;
    connectionSelected: (conn: Connection) => void;
}

export const ConnectionSelector = (props: IProps) => {
    let connection: Connection;
    const ready = () => props.connectionSelected(connection);

    const selectLocal = () => {
        connection = new LocalConnection(data => props.receiveMessage(data), ready);
    }

    
    const [serverId, setServerId] = useState('');

    const selectRemote = () => {
        connection = new RemoteConnection(serverId, data => props.receiveMessage(data), ready);
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
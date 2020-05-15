import React, { useState } from 'react';
import { ServerConnection } from '../../../framework/ServerConnection';
import { RemoteServerConnection } from '../../../framework/RemoteServerConnection';
import { ClientToServerCommand } from '../../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../../shared/ServerToClientCommand';
import { ClientState } from '../../shared/ClientState';
import ServerWorker from '../../server/worker';
import { LocalServerConnection } from '../../../framework/LocalServerConnection';
import { defaultSignalSettings } from '../../../framework/SignalConnection';

export type TypedConnection = ServerConnection<ClientToServerCommand, ServerToClientCommand, ClientState>;

interface IProps {
    receiveCommand: (cmd: ServerToClientCommand) => void;
    stateChanged: (prevState: ClientState, state: ClientState) => void;
    connectionSelected: (conn: TypedConnection) => void;
}

export const ConnectionSelector = (props: IProps) => {
    let connection: TypedConnection;
    const ready = () => props.connectionSelected(connection);

    const selectLocal = () => {
        connection = new LocalServerConnection<ClientToServerCommand, ServerToClientCommand, ClientState>(
            {
                initialClientState: {
                    rules: {
                        active: false
                    },
                    players: {}
                },
                clientName: localName,
                signalSettings: defaultSignalSettings,
                worker: new ServerWorker(),
                receiveCommand: cmd => props.receiveCommand(cmd),
                clientStateChanged: (prevState, state) => props.stateChanged(prevState, state),
                receiveError: msg => console.error(msg),
            },
            ready
        );
    }
    
    const [sessionId, setSessionId] = useState('');

    const [localName, setLocalName] = useState('');

    const selectRemote = () => {
        connection = new RemoteServerConnection<ClientToServerCommand, ServerToClientCommand, ClientState>({
            initialClientState: {
                rules: {
                    active: false
                },
                players: {}
            },
            sessionId,
            signalSettings: defaultSignalSettings,
            clientName: localName,
            receiveCommand: cmd => props.receiveCommand(cmd),
            clientStateChanged: (prevState, state) => props.stateChanged(prevState, state),
            receiveError: msg => console.error(msg),
            ready,
        });
    }

    return (
    <div>
        <div>
            <input
                type="text"
                placeholder="enter your name"
                value={localName}
                onChange={e => setLocalName(e.target.value)}
            />
        </div>

        <div style={{marginTop: '2em'}}>
            <button onClick={selectLocal}>Host a local server</button>
        </div>

        <div style={{marginTop: '2em'}}>
            <input
                type="text"
                placeholder="enter server ID"
                value={sessionId}
                onChange={e => setSessionId(e.target.value)}
            />
            <button 
                onClick={selectRemote}
                disabled={sessionId.length === 0}
            >
                Join a remote server
            </button>
        </div>
    </div>
    );
}
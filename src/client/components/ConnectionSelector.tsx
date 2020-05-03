import React, { useState } from 'react';
import { ServerConnection } from '../../framework/ServerConnection';
import { RemoteServerConnection } from '../../framework/RemoteServerConnection';
import { ClientToServerCommand } from '../../shared/ClientToServerCommand';
import { ServerToClientCommand } from '../../shared/ServerToClientCommand';
import { ClientState } from '../../shared/ClientState';
import ServerWorker from '../../server/worker';
import { LocalServerConnection } from '../../framework/LocalServerConnection';
import { defaultSignalSettings } from '../../framework/SignalConnection';

export type TypedConnection = ServerConnection<ClientToServerCommand, ServerToClientCommand, ClientState>;

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
        connection = new LocalServerConnection<ClientToServerCommand, ServerToClientCommand, ClientState>(
            {
                initialState: {
                    rules: {
                        active: false
                    }
                },
                clientName,
                signalSettings: defaultSignalSettings,
                worker: new ServerWorker(),
                receiveCommand: cmd => props.receiveCommand(cmd),
                //receiveState: state => props.receiveState(state),
                receiveError: msg => console.error(msg),
                playersChanged: players => console.log('player list is', players),
            },
            ready
        );
    }
    
    const [sessionId, setSessionId] = useState('');

    const selectRemote = () => {
        connection = new RemoteServerConnection<ClientToServerCommand, ServerToClientCommand, ClientState>({
            initialState: {
                rules: {
                    active: false
                }
            },
            sessionId,
            signalSettings: defaultSignalSettings,
            clientName,
            receiveCommand: cmd => props.receiveCommand(cmd),
            //receiveState: state => props.receiveState(state),
            receiveError: msg => console.error(msg),
            playersChanged: players => console.log('player list is', players),
            ready,
        });
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
import { ServerToClientMessage } from './ServerToClientMessage';

export interface IClientConnection<TServerToClientCommand, TClientState> {
    readonly clientName: string;

    send(message: ServerToClientMessage<TServerToClientCommand, TClientState>): void;

    disconnect(): void;
}
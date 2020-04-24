import { ServerToClientMessage } from './ServerToClientMessage';

export interface IClient<TServerToClientCommand, TClientState> {
    readonly name: string;

    send(message: ServerToClientMessage<TServerToClientCommand, TClientState>): void;

    disconnect(): void;
}
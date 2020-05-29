import { ServerToClientMessage } from './ServerToClientMessage';

export interface IClientConnection<TServerToClientCommand> {
    readonly clientName: string;

    send(
        message: ServerToClientMessage<TServerToClientCommand>
    ): void;

    disconnect(): void;
}

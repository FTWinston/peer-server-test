import { ServerToClientMessage, IEvent } from './ServerToClientMessage';

export interface IClientConnection<TEvent extends IEvent> {
    readonly clientName: string;

    send(message: ServerToClientMessage<TEvent>): void;

    disconnect(): void;
}

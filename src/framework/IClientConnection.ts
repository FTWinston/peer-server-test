import { ServerToClientMessage, IEvent } from './ServerToClientMessage';

export interface IClientConnection<TServerEvent extends IEvent> {
    readonly clientName: string;

    send(message: ServerToClientMessage<TServerEvent>): void;

    disconnect(): void;
}

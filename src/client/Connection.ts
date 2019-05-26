export abstract class Connection {
    abstract sendMessage(msg: any): void;

    abstract disconnect(): void;

    /*
    protected receiveMessage: (e: any) => void;

    protected receiveState: (e: any) => void;
    */
}
import { Connection } from './Connection';
import Worker from 'worker-loader!../server/worker';

export class LocalConnection extends Connection {
    private worker: Worker;

    constructor(receiveMessage: (data: any) => void) {
        super();
        
        this.worker = new Worker();

        this.worker.onmessage = e => receiveMessage(e.data);
    }

    sendMessage(msg: any) {
        this.worker.postMessage(msg);
    }

    disconnect() {
        this.worker.terminate();
    }
}
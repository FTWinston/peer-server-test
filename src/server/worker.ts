import { PeerServer } from './PeerServer';

export default {} as typeof Worker & (new () => Worker);

const worker: Worker = self as any;

const server = new PeerServer(message => worker.postMessage(message));

worker.onmessage = e => server.receiveMessage(e.data);

console.log('server worker started');
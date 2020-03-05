import { TestPeerServer } from './TestServer';

export default {} as typeof Worker & (new () => Worker);

console.log('server worker started');

const worker: Worker = self as any;

new TestPeerServer(worker);
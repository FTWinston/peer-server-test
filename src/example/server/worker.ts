import { TestServer } from './TestServer';

export default {} as typeof Worker & (new () => Worker);

console.log('server worker started');

const worker: Worker = self as any;

const server = new TestServer((msg) => worker.postMessage(msg));

worker.onmessage = (e) => server.receiveMessage(e.data);

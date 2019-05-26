export const worker: Worker = self as any;

console.log('worker started');

worker.onmessage = e => {
    console.log('worker received message', e.data);

    worker.postMessage('sod off');
    /*
    const data = e.data as [string, number];

    if (data[0] === 'generate') {
        
    }
    */
}
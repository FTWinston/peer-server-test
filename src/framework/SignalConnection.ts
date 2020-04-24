import SimplePeer, { Instance } from 'simple-peer';

export class SignalConnection {
    private readonly socket: WebSocket;

    constructor(
        url: string,
        private readonly sessionAssigned: (id: string) => void,
        private readonly isNameAllowed: (name: string) => boolean,
        private readonly join: (name: string, peer: Instance) => void,
        private readonly disconnected: () => void,
    ) {
        this.socket = new WebSocket(url);

        this.socket.onopen = event => {
            // TODO: send signal data ... ? No. Nothing to send initially.
        };

        this.socket.onclose = event => {
            this.disconnected();
        };

        this.socket.onerror = event => {
            this.disconnected();
        };

        this.socket.onmessage = async event => {
            const data: string[] = JSON.parse(event.data);

            if (!Array.isArray(data) || data.length < 2) {
                throw new Error(`Unexpected data type received from signal server, expected string[], but got ${data}`);
            }

            const message = data[0];

            if (message === 'id') {
                this.sessionAssigned(data[1]);
            }
            else if (message === 'join') {
                const name = data[1].trim();

                if (this.isNameAllowed(name)) {
                    const peer = this.createPeer();

                    const offer = data[2];
                    const answer = await this.signalPeer(peer, offer);

                    this.join(name, peer);

                    this.socket.send(JSON.stringify([true, answer]));
                }
                else {
                    this.socket.send(JSON.stringify([false, 'This name is in use or not allowed. Use a different name.']));
                }

            }
            else {
                throw new Error(`Unexpected message received from signal server, expected 'id' or 'join' but got ${message}`);
            }
        };
    }

    private createPeer() {
        const peer = new SimplePeer({
            initiator: false,
            trickle: false, // ensure a single "signal" event
        });

        return peer;
    }

    private signalPeer(peer: Instance, offer: string) {
        // Pass the received signal into the peer, and resolve with its response.
        return new Promise<string>(resolve => {
            peer.on('signal', answer => {
                resolve(answer);
            });
    
            peer.signal(offer);
        });
    }

    public get connected() {
        return this.socket.readyState === WebSocket.OPEN;
    }

    public disconnect() {
        this.socket.close();
    }
}
import { gatherSomeIceCandidates, createPeer, getSignalUrl } from './Signalling';

export class ServerSignalConnection {
    private readonly socket: WebSocket;

    constructor(
        private readonly sessionAssigned: (id: string) => void,
        private readonly isNameAllowed: (name: string) => boolean,
        private readonly join: (name: string, peer: RTCPeerConnection) => void,
        private readonly disconnected: () => void,
    ) {
        this.socket = new WebSocket(`${getSignalUrl()}/host`);

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
                    const peer = createPeer();

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

    private async signalPeer(peer: RTCPeerConnection, offer: string) {
        console.log('set remote description');
        await peer.setRemoteDescription({
            sdp: offer,
            type: 'offer'
        });

        await gatherSomeIceCandidates(peer);

        console.log('creating answer');
        const answer = await peer.createAnswer();

        console.log('set local description');
        await peer.setLocalDescription(answer); // TODO: won't gather ICE until this is called? ... ach do we care?
        // Does the server even have to pass its ICE back to the client?

        return answer.sdp;
    }

    public get connected() {
        return this.socket.readyState === WebSocket.OPEN;
    }

    public disconnect() {
        this.socket.close();
    }
}
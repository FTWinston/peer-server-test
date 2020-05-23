import { SignalConnection, IConnectionSettings } from './SignalConnection';

export class ServerSignalConnection extends SignalConnection {
    private connectingPeers: Map<string, RTCPeerConnection>;

    constructor(
        settings: IConnectionSettings,
        private readonly sessionAssigned: (id: string) => void,
        private readonly isNameAllowed: (name: string) => boolean,
        private readonly join: (name: string, peer: RTCPeerConnection) => void,
        disconnected: () => void
    ) {
        super(disconnected, settings);

        this.connectingPeers = new Map<string, RTCPeerConnection>();
    }

    protected async socketOpened() {
        this.send(['host']);
    }

    protected async receivedMessage(event: MessageEvent) {
        const data: string[] = JSON.parse(event.data);
        const message = data[0];

        if (!Array.isArray(data) || data.length < 1) {
            throw new Error(
                `Unexpected data type received from signal server, expected array but got ${data}`
            );
        }

        if (message === 'id') {
            this.sessionAssigned(data[1]);
        } else if (message === 'join') {
            await this.receiveJoin(data[1], data[2]);
        } else if (message === 'ice') {
            await this.receiveIce(data[1], data[2]);
        } else {
            throw new Error(
                `Unexpected data received from signal server, expected id, join or ice, but got ${message}`
            );
        }
    }

    private async receiveJoin(name: string, offer: string) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`received join from ${name}`);
        }

        if (!this.isNameAllowed(name)) {
            this.send([
                'reject',
                name,
                'This name is in use or not allowed. Use a different name.',
            ]);
            return;
        }

        const peer = this.createPeer();

        this.connectingPeers.set(name, peer);

        peer.onconnectionstatechange = () => {
            if (process.env.NODE_ENV === 'development') {
                console.log(`peer state changed: ${peer.connectionState}`);
            }

            if (peer.connectionState === 'connected') {
                this.join(name, peer);
                this.connectingPeers.delete(name);
            }
        };

        this.gatherIce(peer, name);

        if (process.env.NODE_ENV === 'development') {
            console.log('set remote description');
        }

        await peer.setRemoteDescription({
            sdp: offer,
            type: 'offer',
        });

        if (process.env.NODE_ENV === 'development') {
            console.log('creating answer');
        }
        const answer = await peer.createAnswer();

        if (process.env.NODE_ENV === 'development') {
            console.log('set local description');
        }

        await peer.setLocalDescription(answer);

        this.send(['accept', name, peer.localDescription.sdp]);
    }

    private async receiveIce(name: string, data: string) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`received ice from ${name}`);
        }

        const peer = this.connectingPeers.get(name);

        if (peer) {
            await peer.addIceCandidate(JSON.parse(data));
        } else if (process.env.NODE_ENV === 'development') {
            console.log(
                `Received ice that isn't from a connecting client: ${name}`
            );
        }
    }
}

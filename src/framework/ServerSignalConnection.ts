import { SignalConnection, ISignalSettings } from './SignalConnection';

export class ServerSignalConnection extends SignalConnection {
    constructor(
        settings: ISignalSettings,
        private readonly sessionAssigned: (id: string) => void,
        private readonly isNameAllowed: (name: string) => boolean,
        private readonly join: (name: string, peer: RTCPeerConnection) => void,
        disconnected: () => void,
    ) {
        super(settings, disconnected);
    }

    protected async socketOpened() {
        this.send(['host']);
    }

    protected async receivedMessage(event: MessageEvent) {
        const data: string[] = JSON.parse(event.data);
        const message = data[0];

        if (!Array.isArray(data) || data.length < 1) {
            throw new Error(`Unexpected data type received from signal server, expected array but got ${data}`);
        }

        if (message === 'id') {
            this.sessionAssigned(data[1]);
        }
        else if (message === 'join') {
            await this.receiveJoin(data[1], data[2]);
        }
        else if (message === 'ice') {
            // TODO: receive ice
        }
        else {
            throw new Error(`Unexpected data received from signal server, expected id, join or ice, but got ${message}`);
        }
    }

    private async receiveJoin(name: string, offer: string) {
        if (!this.isNameAllowed(name)) {
            this.send(['reject', name, 'This name is in use or not allowed. Use a different name.']);
            return;
        }

        const peer = this.createPeer();
        
        console.log('set remote description');
        await peer.setRemoteDescription({
            sdp: offer,
            type: 'offer'
        });

        // await gatherSomeIceCandidates(peer);
        let gathering = true;
        let gotAny = false;
        peer.onicecandidate = event => {
            console.log('ice candidate');
            if (gathering && event.candidate) {
                this.send(['ice', name, event.candidate.toJSON()]);

                if (!gotAny) {
                    gotAny = true;
                    setTimeout(() => {
                        console.log('finishing with ice candidates');
                        gathering = false;
                    }, 5000);
                }
            }
        };

        console.log('creating answer');
        const answer = await peer.createAnswer();

        console.log('set local description');
        await peer.setLocalDescription(answer);

        this.join(name, peer);
        this.send(['accept', name, answer.sdp]);
    }
}
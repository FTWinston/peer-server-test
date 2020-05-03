import { SignalConnection, ISignalSettings } from './SignalConnection';

export class ClientSignalConnection extends SignalConnection {
    private readonly peer: RTCPeerConnection;

    constructor(
        settings: ISignalSettings,
        private readonly sessionId: string,
        private readonly clientName: string,
        private readonly join: (peer: RTCPeerConnection) => void,
        disconnected: () => void,
    ) {
        super(settings, disconnected);

        this.peer = this.createPeer();
    }

    protected async socketOpened() {
        const offer = await this.peer.createOffer();
        await this.peer.setLocalDescription(offer);
        this.send(['join', this.sessionId, this.clientName, offer.sdp]);
    }

    protected async receivedMessage(event: MessageEvent) {
        const data: string[] = JSON.parse(event.data);
        const message = data[0];

        if (!Array.isArray(data) || data.length < 1) {
            throw new Error(`Unexpected data type received from signal server, expected array but got ${data}`);
        }

        if (message === 'answer') {
            this.receiveAnswer(message[1]);
        }
        else if (message === 'ice') {

        }
        else {
            throw new Error(`Unexpected data received from signal server, expected answer or ice, but got ${message}`);
        }
    }

    private async receiveAnswer(answer: string) {
        console.log('set remote description');
        await this.peer.setRemoteDescription({
            sdp: answer,
            type: 'answer'
        });

        // await gatherSomeIceCandidates(peer);
        let gathering = true;
        let gotAny = false;
        this.peer.onicecandidate = event => {
            console.log('ice candidate');
            if (gathering && event.candidate) {
                this.send(['ice', '', event.candidate.toJSON()]);

                if (!gotAny) {
                    gotAny = true;
                    setTimeout(() => {
                        console.log('finishing with ice candidates');
                        gathering = false;
                    }, 5000);
                }
            }
        };

        this.join(this.peer);
    }
}
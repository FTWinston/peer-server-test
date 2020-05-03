export interface ISignalSettings {
    signalUrl: string;
    iceDelay: number;
}

export abstract class SignalConnection {
    private readonly socket: WebSocket;

    constructor(
        protected readonly settings: ISignalSettings,
        protected readonly disconnected: () => void,
    ) {
        this.socket = new WebSocket(settings.signalUrl);

        this.socket.onopen = event => this.socketOpened(event);

        this.socket.onmessage = event => this.receivedMessage(event);

        this.socket.onclose = event => {
            this.disconnected();
        };

        this.socket.onerror = event => {
            this.disconnected();
        };
    }

    protected abstract socketOpened(event: Event): Promise<void>;

    protected abstract receivedMessage(event: MessageEvent): Promise<void>;

    protected send(data: Array<string | RTCIceCandidateInit>) {
        this.socket.send(JSON.stringify(data));
    }

    protected createPeer() {
        return new RTCPeerConnection();
    }

    public get connected() {
        return this.socket.readyState === WebSocket.OPEN;
    }

    public disconnect() {
        this.socket.close();
    }
}



// Don't wait for all possible candidates, as that might take ages.
export function gatherSomeIceCandidates(peer: RTCPeerConnection) {
    return new Promise<void>(resolve => {
        let hasIce = false;
        console.log('promise started');

        peer.onicecandidate = event => {
            console.log('ice candidate');
            if (!hasIce && event.candidate) {
                hasIce = true;
                setTimeout(() => {
                    console.log('finishing with ice candidates');
                    resolve();
                }, 5000);
            }
        };
    });
}

export const defaultSignalSettings = {
    signalUrl: process.env.NODE_ENV === 'production'
        ? 'wss://signal.ftwinston.com'
        : 'ws://localhost:63367',
    iceDelay: 5000,
}
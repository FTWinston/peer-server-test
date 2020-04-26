export function createPeer() {
    console.log('create peer');
    return new RTCPeerConnection();
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

export function getSignalUrl() {
    if (process.env.NODE_ENV === 'production') {
        return 'https://signal.ftwinston.com';
    }
    else {
        return 'http://localhost:63367';
    }
}

type JoinResult = {
    success: true;
} | {
    success: false;
    error: string;
}

export async function joinSession(peer: RTCPeerConnection, sessionId: string, clientName: string): Promise<JoinResult> {
    const offer = await peer.createOffer();
    
    await peer.setLocalDescription(offer);

    await gatherSomeIceCandidates(peer);

    const result = await fetch(
        `${getSignalUrl()}/join/${sessionId}`,
        {
            method: 'post',
            body: JSON.stringify({
                offer: peer.localDescription,
                name: clientName,
            }),
        }
    );

    if (result.ok) {
        const answer = await result.json() as RTCSessionDescription;
        peer.setRemoteDescription(answer);

        return {
            success: true,
        };
    }

    return {
        success: false,
        error: await result.text(),
    };
}
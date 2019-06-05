import { IEntity } from "./IEntity";

export class Client<TClientEntity extends IEntity> {
    public lastAcknowledgedState?: number;

    private readonly unacknowledgedDeltas: {[stateId: number]: TClientEntity[]} = {};

    public acknowledge(stateId: number) {
        for (const testStateId in this.unacknowledgedDeltas) {
            if ((testStateId as unknown as number) <= stateId) {
                delete this.unacknowledgedDeltas[testStateId];
            }
        }
    }

    public shouldSendFullState() {

    }
}
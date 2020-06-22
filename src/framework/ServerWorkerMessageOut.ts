import { ControlOperation } from './ServerToClientMessage';
import { PatchOperation } from 'filter-mirror';

export const enum ServerWorkerMessageOutType {
    Ready,
    FullState,
    DeltaState,
    Event,
    Disconnect,
    Control,
}

export type ServerWorkerMessageOut<TServerEvent> =
    | {
          type: ServerWorkerMessageOutType.FullState;
          who: string;
          time: number;
          state: string;
      }
    | {
          type: ServerWorkerMessageOutType.DeltaState;
          who: string;
          time: number;
          state: PatchOperation[];
      }
    | {
          type: ServerWorkerMessageOutType.Event;
          who?: string;
          event: TServerEvent;
      }
    | {
          type: ServerWorkerMessageOutType.Ready;
      }
    | {
          type: ServerWorkerMessageOutType.Disconnect;
          who?: string;
          message: string;
      }
    | {
          type: ServerWorkerMessageOutType.Control;
          who?: string;
          operation: ControlOperation;
      };

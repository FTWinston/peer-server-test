import { ControlOperation } from './ServerToClientMessage';
import { PatchOperation } from 'filter-mirror';

export const enum ServerWorkerMessageOutType {
    Ready,
    FullState,
    DeltaState,
    Command,
    Disconnect,
    Control,
}

export type ServerWorkerMessageOut<TServerToClientCommand, TClientState> =
    | {
          type: ServerWorkerMessageOutType.FullState;
          who: string;
          time: number;
          state: TClientState;
      }
    | {
          type: ServerWorkerMessageOutType.DeltaState;
          who: string;
          time: number;
          state: PatchOperation[];
      }
    | {
          type: ServerWorkerMessageOutType.Command;
          who?: string;
          command: TServerToClientCommand;
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

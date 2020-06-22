export const enum ServerWorkerMessageInType {
    Join = 1,
    Quit,
    Acknowledge,
    Command,
}

export type ServerWorkerMessageIn<TClientCommand> =
    | {
          type: ServerWorkerMessageInType.Command;
          who: string;
          command: TClientCommand;
      }
    | {
          type: ServerWorkerMessageInType.Join;
          who: string;
      }
    | {
          type: ServerWorkerMessageInType.Acknowledge;
          who: string;
          time: number;
      }
    | {
          type: ServerWorkerMessageInType.Quit;
          who: string;
      };

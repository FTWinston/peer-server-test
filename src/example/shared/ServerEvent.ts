export type ServerEvent =
{
    type: 'explode',
    entity: string;
} | {
    type: 'spawn',
    entity: string;
    x: number;
    y: number;
}

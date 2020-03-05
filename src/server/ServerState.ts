import { ClientEntity } from '../shared/ClientState';

// TODO: supertype of some sort, here
export type ServerState = Record<string, ClientEntity>;
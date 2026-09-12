import { KEYS, read, seedClients } from "../core";
export const clientsRepository = { getClients: () => read(KEYS.clients, seedClients) };

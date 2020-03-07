export interface ClientInfo {
    readonly id: string;
    readonly name: string;
}

export function isValidName(name: string) {
    if (name.length < 1 || name.length > 50) {
        return false;
    }

    return true;
}
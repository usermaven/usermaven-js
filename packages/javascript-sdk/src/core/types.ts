export interface UserProps {
    id?: string;
    email?: string;
    [key: string]: any;
}

export interface EventPayload {
    [key: string]: any;
}

export interface Transport {
    send(payload: any): Promise<void>;
}

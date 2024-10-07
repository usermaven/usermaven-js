export interface EventPayload {
    [key: string]: any;
}

export interface UserProps extends EventPayload {
    id?: string;
    email?: string;
}


export interface Transport {
    send(payload: any): Promise<void>;
}

export interface UserProps {
    id?: string;
    email?: string;
    [key: string]: any;
}


export type Policy = 'strict' | 'keep' | 'comply';

export interface CompanyProps {
    id: string;
    name: string;
    created_at: string;
    [key: string]: any;
}

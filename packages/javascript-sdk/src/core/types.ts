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

/**
 * Environment where the event have happened.
 */
export type ClientProperties = {
    screen_resolution: string        //screen resolution
    user_agent: string               //user
    referer: string                  //document referer
    url: string                      //current url
    page_title: string               //page title
                                     //see UTM_TYPES for all supported utm tags
    doc_path: string                 //document path
    doc_host: string                 //document host
    doc_search: string               //document search string

    vp_size: string                  //viewport size
    user_language: string            //user language
    doc_encoding: string
}

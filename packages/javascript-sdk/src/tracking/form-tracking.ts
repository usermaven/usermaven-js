import { UsermavenClient } from '../core/client';

export class FormTracking {
    private client: UsermavenClient;

    constructor(client: UsermavenClient) {
        this.client = client;
        this.initializeFormTracking();
    }

    private initializeFormTracking(): void {
        document.addEventListener('submit', this.handleFormSubmit.bind(this));
    }

    private handleFormSubmit(event: Event): void {
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);
        const formFields: { [key: string]: string } = {};

        formData.forEach((value, key) => {
            if (typeof value === 'string') {
                formFields[key] = value;
            }
        });

        const eventData = {
            autocapture_attributes: {
                tag_name: 'form',
                attr__id: form.id,
                attr__name: form.name,
                attr__action: form.action,
                attr__method: form.method,
                event_type: 'submit'
            },
            form_fields: formFields
        };

        this.client.track('$form', eventData);
    }
}

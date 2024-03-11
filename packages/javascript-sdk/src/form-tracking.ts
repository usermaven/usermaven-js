import {UsermavenClient} from "./interface";
import {_cleanObject} from "./utils";

export default class FormTracking {
    instance: UsermavenClient;
    formElements: NodeListOf<HTMLFormElement>;

    // Singleton instance
    private static instance: FormTracking;

    private constructor(instance: UsermavenClient) {
        this.instance = instance;

        // Wait for the DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.track.bind(this))
        } else {
            this.track()
        }
    }

    /**
     * Track form submit
     * @description this function will be called on every form submit event to track form submit
     */
    track() {
        this.formElements = document.querySelectorAll('form');
        this.formElements.forEach(form => {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                const form = event.target as HTMLFormElement;
                const props = this._getFormDetails(form);

                this.instance.capture('$form', _cleanObject(props));
            });
        });
    }

    public static getInstance(instance: UsermavenClient): FormTracking {
        if (!FormTracking.instance) {
            FormTracking.instance = new FormTracking(instance);
        }
        return FormTracking.instance;
    }

    private _getFormDetails(form: HTMLFormElement) {
        const formDetails = {
            form_id: form.id,
            form_name: form.name || '',
            form_action: form.action,
            form_method: form.method,
        };

        const formFields = form.querySelectorAll('input, select, textarea') as NodeListOf<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

        formFields.forEach((field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, index: number) => {
            const fieldProps = this._getFieldProps(field, index);
            Object.assign(formDetails, fieldProps);
        });

        return formDetails;
    }

    private _getFieldProps(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, index: number) {
        const fieldDataAttributes = Object.keys(field.dataset).length ? JSON.stringify(field.dataset) : undefined;
        const safeValue = this.getSafeText(field);

        return {
            [`field_${index + 1}_tag`]: field.tagName.toLowerCase(),
            [`field_${index + 1}_type`]: field instanceof HTMLInputElement ? field.type : undefined,
            [`field_${index + 1}_data_attributes`]: fieldDataAttributes,
            [`field_${index + 1}_id`]: field.id,
            [`field_${index + 1}_value`]: safeValue,
            [`field_${index + 1}_class`]: field.className,
            [`field_${index + 1}_name`]: field.name,
        };
    }

    private getSafeText(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | Node): string {
        let safeText = '';

        if ('value' in element && element.type !== "password") {
            safeText = element.value;
        } else if (element.hasChildNodes()) {
            const textNodes = Array.from(element.childNodes).filter(
                node => node.nodeType === Node.TEXT_NODE
            );
            safeText = textNodes.map(node => node.textContent).join('');
        } else {
            safeText = element.textContent || '';
        }


        return this._scrubPotentiallySensitiveValues(safeText);
    }


    private _scrubPotentiallySensitiveValues(text: string): string {

        if (!this._shouldCaptureValue(text)) {
            return '<redacted>';
        }

        return text;
    }


    private _shouldCaptureValue(value: string): boolean {
        if (this._isNullish(value)) {
            return false;
        }

        if (this._isString(value)) {
            value = this._trim(value);

            // check to see if input value looks like a credit card number
            // see: https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9781449327453/ch04s20.html
            const ccRegex =
                /^(?:(4[0-9]{12}(?:[0-9]{3})?)|(5[1-5][0-9]{14})|(6(?:011|5[0-9]{2})[0-9]{12})|(3[47][0-9]{13})|(3(?:0[0-5]|[68][0-9])[0-9]{11})|((?:2131|1800|35[0-9]{3})[0-9]{11}))$/;
            if (ccRegex.test((value || '').replace(/[- ]/g, ''))) {
                return false;
            }

            // check to see if input value looks like a social security number
            const ssnRegex = /(^\d{3}-?\d{2}-?\d{4}$)/;
            if (ssnRegex.test(value)) {
                return false;
            }
        }

        return true;
    }


    private _isNullish(value: any): boolean {
        return value === null || value === undefined;
    }

    private _isString(value: any): boolean {
        return typeof value === 'string' || value instanceof String;
    }

    private _trim(value: string): string {
        return value.trim().replace(/^\s+|\s+$/g, '');
    }
}

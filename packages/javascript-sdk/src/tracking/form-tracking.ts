import { UsermavenClient } from '../core/client';
import { _cleanObject } from '../utils/common';

export default class FormTracking {
  private instance: UsermavenClient;
  private formElements?: NodeListOf<HTMLFormElement>;
  private trackingType: 'all' | 'tagged' | 'none';
  private options: FormTrackingOptions;

  // Singleton instance
  private static instance: FormTracking;

  private constructor(
    instance: UsermavenClient,
    trackingType: 'all' | 'tagged' | 'none' = 'all',
    options: FormTrackingOptions = {},
  ) {
    this.instance = instance;
    this.trackingType = trackingType;
    this.options = options;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.initialize.bind(this));
    } else {
      this.initialize();
    }
  }

  private initialize(): void {
    if (this.trackingType === 'none') {
      return;
    }

    this.setupFormTracking();
  }

  private setupFormTracking(): void {
    this.formElements =
      this.trackingType === 'tagged'
        ? document.querySelectorAll('form[data-um-form]')
        : document.querySelectorAll('form');

    this.formElements?.forEach((form) => {
      form.addEventListener('submit', this.handleFormSubmit.bind(this));
    });
  }

  private handleFormSubmit(event: Event): void {
    const form = event.target as HTMLFormElement;
    const props = this._getFormDetails(form);

    this.instance.track('$form', _cleanObject(props));

    if (this.options.trackFieldChanges) {
      this.trackFieldChanges(form);
    }
  }

  private trackFieldChanges(form: HTMLFormElement): void {
    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach((field) => {
      field.addEventListener('change', (event) => {
        const fieldProps = this._getFieldProps(
          event.target as
            | HTMLInputElement
            | HTMLSelectElement
            | HTMLTextAreaElement,
        );
        this.instance.track(
          '$form_field_change',
          _cleanObject({
            form_id: form.id,
            form_name: form.name || '',
            field: fieldProps,
          }),
        );
      });
    });
  }

  public static getInstance(
    instance: UsermavenClient,
    trackingType: 'all' | 'tagged' | 'none' = 'all',
    options: FormTrackingOptions = {},
  ): FormTracking {
    if (!FormTracking.instance) {
      FormTracking.instance = new FormTracking(instance, trackingType, options);
    }
    return FormTracking.instance;
  }

  private _getFormDetails(form: HTMLFormElement) {
    const formDetails = {
      form_id: form.id,
      form_name: form.name || '',
      form_action: form.action,
      form_method: form.method,
      form_class: form.className,
      form_attributes: this._getElementAttributes(form),
      fields: [] as any[],
    };

    const formFields = form.querySelectorAll(
      'input, select, textarea',
    ) as NodeListOf<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
    const filteredFormFields = Array.from(formFields).filter(
      (field) => !field.classList.contains('um-no-capture'),
    );

    filteredFormFields.forEach(
      (field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
        const fieldProps = this._getFieldProps(field);
        formDetails.fields.push(fieldProps);
      },
    );

    return formDetails;
  }

  private _getFieldProps(
    field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  ) {
    const fieldDataAttributes = Object.keys(field.dataset).length
      ? this._convertDOMStringMapToObject(field.dataset)
      : undefined;
    const safeValue = this.getSafeText(field);

    return {
      tag: field.tagName.toLowerCase(),
      type: field instanceof HTMLInputElement ? field.type : undefined,
      data_attributes: fieldDataAttributes,
      id: field.id,
      value: safeValue,
      class: field.className,
      name: field.name,
      attributes: this._getElementAttributes(field),
    };
  }

  private _getElementAttributes(element: HTMLElement): Record<string, string> {
    return Object.keys(element.dataset).length
      ? this._convertDOMStringMapToObject(element.dataset)
      : {};
  }

  private _convertDOMStringMapToObject(
    dataset: DOMStringMap,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key in dataset) {
      if (dataset.hasOwnProperty(key) && dataset[key] !== undefined) {
        result[key] = dataset[key] as string;
      }
    }
    return result;
  }

  private getSafeText(
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | Node,
  ): string {
    let safeText = '';

    if ('value' in element && element.type !== 'password') {
      safeText = element.value;
    } else if (element.hasChildNodes()) {
      const textNodes = Array.from(element.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE,
      );
      safeText = textNodes.map((node) => node.textContent).join('');
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

      const ccRegex =
        /^(?:(4[0-9]{12}(?:[0-9]{3})?)|(5[1-5][0-9]{14})|(6(?:011|5[0-9]{2})[0-9]{12})|(3[47][0-9]{13})|(3(?:0[0-5]|[68][0-9])[0-9]{11})|((?:2131|1800|35[0-9]{3})[0-9]{11}))$/;
      if (ccRegex.test((value || '').replace(/[- ]/g, ''))) {
        return false;
      }

      const ssnRegex = /(^\d{3}-?\d{2}-?\d{4}$)/;
      if (ssnRegex.test(value)) {
        return false;
      }

      // Add more sensitive data patterns here if needed
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
    // Use native trim if available
    if (typeof String.prototype.trim === 'function') {
      return value.trim();
    }

    // Custom implementation for browsers without native trim
    let start = 0;
    let end = value.length - 1;
    const ws = [
      ' ',
      '\n',
      '\r',
      '\t',
      '\f',
      '\v',
      '\u00A0',
      '\u1680',
      '\u2000',
      '\u2001',
      '\u2002',
      '\u2003',
      '\u2004',
      '\u2005',
      '\u2006',
      '\u2007',
      '\u2008',
      '\u2009',
      '\u200A',
      '\u2028',
      '\u2029',
      '\u202F',
      '\u205F',
      '\u3000',
    ].join('');

    while (start <= end && ws.indexOf(value[start]) > -1) {
      start++;
    }

    while (end >= start && ws.indexOf(value[end]) > -1) {
      end--;
    }

    return value.slice(start, end + 1);
  }
}

interface FormTrackingOptions {
  trackFieldChanges?: boolean;
  // Add more options as needed
}

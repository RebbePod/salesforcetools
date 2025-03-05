import { LightningElement, api, track } from 'lwc';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';

export default class TimePicker extends LightningElement {
    @api is24HourFormat;
    @api isRequired;
    @api label;

    @track hour = '';
    @track minute = '';
    @track ampm = 'AM';
    @track isHourPopupVisible = false;
    @track isMinutePopupVisible = false;
    @track errorMessage = '';

    _hourValue = '';
    _minuteValue = '';
    _ampmValue = false; // false for AM, true for PM

    @api
    get hourValue() {
        return this._hourValue;
    }
    set hourValue(value) {
        this._hourValue = value;
        this.updateHourFromValue(value);
        this.dispatchFlowAttributeChangeEvent('hourValue', value);
    }

    @api
    get minuteValue() {
        return this._minuteValue;
    }
    set minuteValue(value) {
        this._minuteValue = value;
        this.updateMinuteFromValue(value);
        this.dispatchFlowAttributeChangeEvent('minuteValue', value);
    }

    @api
    get ampmValue() {
        return this._ampmValue;
    }
    set ampmValue(value) {
        if (!this.is24HourFormat) {
            // Prioritize deriving AM/PM from hourValue if it exists
            if (this._hourValue !== '') {
                const hourInt = parseInt(this._hourValue, 10);
                this._ampmValue = hourInt >= 12; // PM if 12 or more
            } else {
                this._ampmValue = Boolean(value); // Use Flow input as fallback
            }

            this.ampm = this._ampmValue ? 'PM' : 'AM';
            this.updateOutput();
            this.dispatchFlowAttributeChangeEvent('ampmValue', this._ampmValue);
        }
    }

    connectedCallback() {
        if (this.is24HourFormat === undefined) {
            this.is24HourFormat = false;
        }
    }

    @api
    validate() {
        if (this.isRequired && (!this._hourValue || !this._minuteValue)) {
            this.errorMessage = 'Both hour and minute are required.';
            return {
                isValid: false,
                errorMessage: this.errorMessage,
            };
        }

        this.errorMessage = '';
        return { isValid: true };
    }

    get hourMin() {
        return this.is24HourFormat ? 0 : 1;
    }

    get hourMax() {
        return this.is24HourFormat ? 23 : 12;
    }

    get hours() {
        return this.is24HourFormat
            ? Array.from({ length: 24 }, (_, i) => i.toString())
            : Array.from({ length: 12 }, (_, i) => (i + 1).toString());
    }

    get minuteOptions() {
        return Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
    }

    handleHourChange(event) {
        const value = event.target.value.trim();
        this.hour = value === '' ? '' : value;
        this.updateOutput();
    }

    handleMinuteChange(event) {
        const value = event.target.value.trim();
        this.minute = value === '' ? '' : value.padStart(2, '0');
        this.updateOutput();
    }

    toggleAmPm() {
        if (!this.is24HourFormat) {
            this._ampmValue = !this._ampmValue; // Toggle true/false
            this.ampm = this._ampmValue ? 'PM' : 'AM';
            this.dispatchFlowAttributeChangeEvent('ampmValue', this._ampmValue);
        }
        this.updateOutput();
    }

    updateHourFromValue(value) {
        if (value === '' || value === null || value === undefined) {
            this.hour = '';
            this.ampm = 'AM'; // Default to AM when empty
            this._ampmValue = false;
            return;
        }

        const hour24 = parseInt(value, 10);
        if (this.is24HourFormat) {
            this.hour = hour24.toString();
        } else {
            this.hour = (hour24 % 12 || 12).toString();
            this._ampmValue = hour24 >= 12; // True if PM, False if AM
            this.ampm = this._ampmValue ? 'PM' : 'AM';
        }
    }

    updateMinuteFromValue(value) {
        this.minute = value === '' ? '' : parseInt(value, 10).toString().padStart(2, '0');
    }

    updateOutput() {
        const hour24 =
            this.hour === ''
                ? ''
                : this.is24HourFormat
                ? parseInt(this.hour, 10)
                : this._ampmValue
                ? (parseInt(this.hour, 10) % 12) + 12
                : parseInt(this.hour, 10) % 12;

        this._hourValue = hour24 === '' ? '' : hour24.toString().padStart(2, '0');
        this._minuteValue = this.minute;

        this.dispatchFlowAttributeChangeEvent('hourValue', this._hourValue);
        this.dispatchFlowAttributeChangeEvent('minuteValue', this._minuteValue);
        if (!this.is24HourFormat) {
            this.dispatchFlowAttributeChangeEvent('ampmValue', this._ampmValue);
        }
    }

    dispatchFlowAttributeChangeEvent(attributeName, value) {
        const attributeChangeEvent = new FlowAttributeChangeEvent(attributeName, value);
        this.dispatchEvent(attributeChangeEvent);
    }

    showHourPopup() {
        this.isHourPopupVisible = true;
    }

    hideHourPopup() {
        this.isHourPopupVisible = false;
    }

    showMinutePopup() {
        this.isMinutePopupVisible = true;
    }

    hideMinutePopup() {
        this.isMinutePopupVisible = false;
    }

    preventBlur(event) {
        event.preventDefault();
    }

    selectHour(event) {
        this.hour = event.target.dataset.value;
        this.updateOutput();
        this.isHourPopupVisible = false;
    }

    selectMinute(event) {
        this.minute = event.target.dataset.value;
        this.updateOutput();
        this.isMinutePopupVisible = false;
    }
}
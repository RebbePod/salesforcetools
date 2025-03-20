import { LightningElement, api } from 'lwc';
import { FlowAttributeChangeEvent, FlowNavigationNextEvent, FlowNavigationFinishEvent } from 'lightning/flowSupport';

export default class ActivePageDetectNav extends LightningElement {
    // Flow Inputs
    @api navigateOnInactive = false;
    @api navigateOnActive = false;
    @api navigateDelayInactive = 0;
    @api navigateDelayActive = 0;
    @api minTimeInactiveBeforeActiveNav = 0;
    @api minTimeActiveBeforeInactiveNav = 0;

    // Flow Outputs
    @api isPageActive;
    @api autoNavigatedInactive = false;
    @api autoNavigatedActive = false;

    // Internal Vars
    lastInactiveTimestamp = null;
    lastActiveTimestamp = performance.now();
    isComponentActive = true;
    pendingInactiveNav = null;
    pendingActiveNav = null;
    @api availableActions = [];

    get nextOrFinish() {
        if (this.availableActions?.includes('NEXT')) {
            return 'NEXT';
        } else if (this.availableActions?.includes('FINISH')) {
            return 'FINISH';
        }
        console.warn('No valid navigation action found. Defaulting to NEXT.');
        return 'NEXT'; // Default to NEXT as a fallback
    }

    connectedCallback() {
        this.isComponentActive = true;

        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.addEventListener('focus', this.handleVisibilityChange.bind(this));
        window.addEventListener('blur', this.handleVisibilityChange.bind(this));

        // Set initial page activity state
        this.isPageActive = document.visibilityState === 'visible' && document.hasFocus();
        this.dispatchEvent(new FlowAttributeChangeEvent('isPageActive', this.isPageActive));
    }

    disconnectedCallback() {
        this.isComponentActive = false;

        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.removeEventListener('focus', this.handleVisibilityChange.bind(this));
        window.removeEventListener('blur', this.handleVisibilityChange.bind(this));

        if (this.pendingInactiveNav) clearTimeout(this.pendingInactiveNav);
        if (this.pendingActiveNav) clearTimeout(this.pendingActiveNav);
    }

    handleVisibilityChange() {
        if (!this.isComponentActive) return;

        const now = performance.now();
        const isActive = document.visibilityState === 'visible' && document.hasFocus();

        if (this.isPageActive === isActive) {
            return;
        }

        console.log(`isPageActive = ${isActive}`);
        this.updateState('isPageActive', isActive);

        if (!isActive) {
            this.handleInactive(now);
        } else {
            this.handleActive(now);
        }
    }

    handleInactive(now) {
        this.lastInactiveTimestamp = now;

        if (this.navigateOnInactive) {
            if (this.pendingActiveNav) {
                clearTimeout(this.pendingActiveNav);
                this.pendingActiveNav = null;
            }
            this.pendingInactiveNav = setTimeout(() => {
                const elapsedTime = now - this.lastActiveTimestamp;
                if (elapsedTime >= this.minTimeActiveBeforeInactiveNav) {
                    this.updateAutoNavigated(true, false);
                    this.triggerNavigation('inactive');
                } else {
                    console.log(`Navigation cancelled (Inactive for only ${elapsedTime.toFixed(2)}ms, required: ${this.minTimeActiveBeforeInactiveNav}ms)`);
                }
            }, this.navigateDelayInactive);
        }
    }

    handleActive(now) {
        const inactiveDuration = now - (this.lastInactiveTimestamp ?? now);
        this.lastActiveTimestamp = now;

        if (this.navigateOnActive) {
            if (this.pendingInactiveNav) {
                clearTimeout(this.pendingInactiveNav);
                this.pendingInactiveNav = null;
            }
            this.pendingActiveNav = setTimeout(() => {
                const elapsedTime = performance.now() - this.lastInactiveTimestamp;
                if (elapsedTime >= this.minTimeInactiveBeforeActiveNav) {
                    this.updateAutoNavigated(false, true);
                    this.triggerNavigation('active');
                } else {
                    console.log(`Navigation cancelled (Active for only ${elapsedTime.toFixed(2)}ms, required: ${this.minTimeInactiveBeforeActiveNav}ms)`);
                }
            }, this.navigateDelayActive);
        }
    }

    updateState(property, value) {
        if (!this.isComponentActive) return;

        if (this[property] !== value) {
            this[property] = value;
            this.dispatchEvent(new FlowAttributeChangeEvent(property, value));

            this.updateAutoNavigated(false, false);
        }
    }

    triggerNavigation(type) {
        if (!this.isComponentActive) return;

        const action = this.nextOrFinish;

        if (action === 'NEXT') {
            this.dispatchEvent(new FlowNavigationNextEvent());
        } else if (action === 'FINISH') {
            this.dispatchEvent(new FlowNavigationFinishEvent());
        } else {
            console.error('No valid navigation action detected! Navigation failed.');
        }
    }

    updateAutoNavigated(inactive, active) {
        if (!this.isComponentActive) return;

        if (this.autoNavigatedInactive !== inactive) {
            this.autoNavigatedInactive = inactive;
            this.dispatchEvent(new FlowAttributeChangeEvent('autoNavigatedInactive', inactive));
        }
        if (this.autoNavigatedActive !== active) {
            this.autoNavigatedActive = active;
            this.dispatchEvent(new FlowAttributeChangeEvent('autoNavigatedActive', active));
        }
    }
}
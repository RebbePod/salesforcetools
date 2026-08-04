import { LightningElement, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import processBase64Image from '@salesforce/apex/ChatterInlineImageController.processBase64Image';

const TOOLBAR_SELECTOR = 'ul[aria-label="Insert content"]';
const INJECTED_MARKER = 'data-image-paste-hook';
const TOOLTIP_TEXT = 'Click here, then paste (Ctrl+V) to attach an image to this post';

// Simple picture-frame icon (Feather-style), rendered as a CSS background on a
// non-editable child span so it doesn't interfere with paste behavior.
const ICON_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='14' height='14' " +
    "fill='none' stroke='%23706e6b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    "<rect x='3' y='3' width='18' height='18' rx='2'/>" +
    "<circle cx='8.5' cy='8.5' r='1.5'/>" +
    "<path d='M21 15l-5-5L5 21'/>" +
    '</svg>';
const ICON_DATA_URL = `data:image/svg+xml,${ICON_SVG}`;
const LABEL_TEXT = 'Paste image';

export default class ChatterInlineImagePaste extends LightningElement {
    @api chatterGroupName;
    @api recordId; // Auto-populated when placed directly on a Record Page

    currentPageRecordId; // Tracks the active record when running from the Utility Bar, via CurrentPageReference
    intervalId;
    editorSelections = new Map();

    @wire(CurrentPageReference)
    setCurrentPageReference(pageRef) {
        this.currentPageRecordId =
            pageRef && pageRef.type === 'standard__recordPage' ? pageRef.attributes?.recordId : null;
    }

    get effectiveRecordId() {
        return this.recordId || this.currentPageRecordId;
    }

    connectedCallback() {
        this.scanForToolbars();

        // Lightning Web Security blocks MutationObserver on shared elements like
        // document.body, so poll instead of observing.
        this.intervalId = setInterval(() => {
            this.scanForToolbars();
        }, 1000);
    }

    disconnectedCallback() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    scanForToolbars() {
        let toolbars;
        try {
            toolbars = document.querySelectorAll(TOOLBAR_SELECTOR);
        } catch (error) {
            return;
        }

        toolbars.forEach((toolbar) => {
            if (toolbar.hasAttribute(INJECTED_MARKER)) {
                return;
            }
            this.injectPlaceholder(toolbar);
        });
    }

    injectPlaceholder(toolbar) {
        toolbar.setAttribute(INJECTED_MARKER, 'true');

        const editor = this.findEditor(toolbar);
        if (editor) {
            this.trackSelection(editor);
        }

        // Create our own separate button group (matching Salesforce's own toolbar
        // group markup) and insert it as a sibling group, rather than adding an <li>
        // into the existing "Insert content" group. That leaves the existing group's
        // own last-child rounding untouched, and since our box is the only child of
        // its own group, SLDS's own stylesheet rounds both of its corners and applies
        // the standard inter-group spacing automatically - no manual copying needed.
        const ourGroup = document.createElement('ul');
        ourGroup.className = toolbar.className;
        ourGroup.setAttribute('role', 'presentation');

        const li = document.createElement('li');

        const box = document.createElement('div');
        box.title = TOOLTIP_TEXT;
        box.className = 'slds-button slds-button_icon-border-filled';
        box.style.display = 'inline-flex';
        box.style.alignItems = 'center';
        box.style.gap = '0.375rem';
        box.style.width = 'auto';
        box.style.padding = '0 0.625rem';
        box.style.cursor = 'text';
        box.style.outline = 'none';
        box.setAttribute('contenteditable', 'true');
        box.setAttribute('aria-label', TOOLTIP_TEXT);

        // Belt-and-suspenders: the slds-button classes are normally applied to a
        // <button>, so also copy height/border/background from a real sibling button
        // in case the class alone doesn't fully style a <div> the same way.
        const referenceButton = toolbar.querySelector('button');
        if (referenceButton) {
            const computed = window.getComputedStyle(referenceButton);
            box.style.height = computed.height;
            box.style.border = computed.border;
            box.style.backgroundColor = computed.backgroundColor;
        }

        const icon = document.createElement('span');
        icon.setAttribute('contenteditable', 'false');
        icon.style.width = '14px';
        icon.style.height = '14px';
        icon.style.flexShrink = '0';
        icon.style.backgroundImage = `url("${ICON_DATA_URL}")`;
        icon.style.backgroundRepeat = 'no-repeat';
        icon.style.backgroundPosition = 'center';
        icon.style.display = 'inline-block';

        const label = document.createElement('span');
        label.setAttribute('contenteditable', 'false');
        label.textContent = LABEL_TEXT;
        label.style.fontSize = '0.75rem';
        label.style.color = '#706e6b';
        label.style.whiteSpace = 'nowrap';

        box.appendChild(icon);
        box.appendChild(label);

        const restingBackgroundColor = box.style.backgroundColor;
        box.addEventListener('mouseenter', () => {
            box.style.backgroundColor = '#f3f3f3';
        });
        box.addEventListener('mouseleave', () => {
            box.style.backgroundColor = restingBackgroundColor;
        });

        box.addEventListener('paste', (event) => this.handlePaste(event, box, toolbar, icon, label));

        // The icon/label are non-editable, so a click landing on them wouldn't
        // normally focus the parent editable box. Handle focus/cursor placement
        // ourselves so the whole box is clickable, not just the small gaps around them.
        box.addEventListener('mousedown', (event) => {
            event.preventDefault();
            box.focus();
            const range = document.createRange();
            range.selectNodeContents(box);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });

        li.appendChild(box);
        ourGroup.appendChild(li);
        toolbar.parentNode.insertBefore(ourGroup, toolbar.nextSibling);
    }

    findEditor(toolbar) {
        const richTextContainer = toolbar.closest('.slds-rich-text-editor');
        return richTextContainer ? richTextContainer.querySelector('.ql-editor') : null;
    }

    trackSelection(editor) {
        const saveSelection = () => {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
                this.editorSelections.set(editor, selection.getRangeAt(0).cloneRange());
            }
        };
        editor.addEventListener('keyup', saveSelection);
        editor.addEventListener('mouseup', saveSelection);
        editor.addEventListener('blur', saveSelection);
    }

    async handlePaste(event, box, toolbar, icon, label) {
        event.preventDefault();

        const items = event.clipboardData ? event.clipboardData.items : [];
        let imageFile;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.startsWith('image/')) {
                imageFile = items[i].getAsFile();
                break;
            }
        }

        if (!imageFile) {
            this.flashBoxColor(box, 'red');
            return;
        }

        const originalLabelText = label.textContent;
        icon.style.display = 'none';
        label.textContent = 'Uploading...';

        try {
            const base64Data = await this.fileToBase64(imageFile);
            const fileName = imageFile.name || `Image_${Date.now()}.png`;

            const result = await processBase64Image({
                base64Data,
                fileName,
                chatterGroupName: this.chatterGroupName,
                recordId: this.effectiveRecordId,
            });

            if (!result.fileId) {
                throw new Error(result.error || 'Unknown error processing image');
            }

            this.insertIntoEditor(toolbar, result.embedHtml);
            this.flashBoxColor(box, 'green');
        } catch (error) {
            const message =
                (error && error.body && error.body.message) ||
                (error && error.message) ||
                JSON.stringify(error);
            console.error('Failed to process pasted image:', message);
            this.flashBoxColor(box, 'red');
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error pasting image',
                    message,
                    variant: 'error',
                })
            );
        } finally {
            icon.style.display = 'inline-block';
            label.textContent = originalLabelText;
        }
    }

    insertIntoEditor(toolbar, embedHtml) {
        const editor = this.findEditor(toolbar);

        if (!editor) {
            console.error('Could not find the Chatter editor to insert the image into.');
            return;
        }

        editor.focus();

        const selection = window.getSelection();
        const savedRange = this.editorSelections.get(editor);

        selection.removeAllRanges();
        if (savedRange && editor.contains(savedRange.startContainer)) {
            selection.addRange(savedRange);
        } else {
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            selection.addRange(range);
        }

        document.execCommand('insertHTML', false, embedHtml);
    }

    flashBoxColor(box, color) {
        const originalBorder = box.style.borderColor;
        box.style.borderColor = color;
        setTimeout(() => {
            box.style.borderColor = originalBorder;
        }, 1500);
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result;
                resolve(dataUrl.substring(dataUrl.indexOf(',') + 1));
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }
}

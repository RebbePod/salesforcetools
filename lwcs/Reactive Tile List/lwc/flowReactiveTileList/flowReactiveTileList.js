// force-app/main/default/lwc/flowReactiveTileList/flowReactiveTileList.js
import { LightningElement, api, wire } from 'lwc';
import {
  FlowAttributeChangeEvent,
  FlowNavigationNextEvent,
  FlowNavigationFinishEvent
} from 'lightning/flowSupport';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

// Map JSON “alignment.h” → CSS justify‐content
const H_MAP = { left: 'start', center: 'center', right: 'end' };
// Map JSON “alignment.v” → CSS align‐content
const V_MAP = { top: 'start', middle: 'center', bottom: 'end' };

export default class FlowReactiveTileList extends LightningElement {
  // ─── backing fields ────────────────────────────────────────────────────────
  _records = [];
  _selectedRecordId;
  _selectedRecordIds = [];
  _buttonValue; // holds last-clicked button's value

  /** Flow inputs */
  @api objectApiName;
  @api layoutConfig;
  @api clickMode            = 'viewOnly'; // viewOnly|singleSelect|multiSelect|singleAutoNavigate
  @api numColumns;
  @api minWidth;
  @api maxWidth;
  @api minHeight;
  @api maxHeight;

  /** Custom CSS overrides */
  @api tileClass            = '';
  @api tileStyle            = '';
  @api tileGap              = '';   // e.g. "2rem"
  @api tileBorder           = '';   // e.g. "1px solid #ddd"
  @api tileHoverStyle       = '';   // e.g. "box-shadow:0 4px 8px rgba(0,0,0,0.2);"
  @api tileSelectedBorder   = '';   // e.g. "2px solid green"
  @api tileSelectedBackground = ''; // e.g. "#ffebcc"

  @api selectedTileStyle    = '';   // extra CSS on selected tile
  @api availableActions     = [];   // for autoNavigate

  /** Flow‐bound output for a button click */
  @api
  get buttonValue() {
    return this._buttonValue;
  }
  set buttonValue(val) {
    this._buttonValue = val;
    this.dispatchEvent(new FlowAttributeChangeEvent('buttonValue', val));
  }

  /** Flow‐bound selection (two‐way) */
  @api
  get selectedRecordId() {
    return this._selectedRecordId;
  }
  set selectedRecordId(val) {
    this._selectedRecordId = val;
    this.dispatchEvent(new FlowAttributeChangeEvent('selectedRecordId', val));
  }

  @api
  get selectedRecordIds() {
    return this._selectedRecordIds;
  }
  set selectedRecordIds(val) {
    this._selectedRecordIds = Array.isArray(val) ? val : [];
    this.dispatchEvent(new FlowAttributeChangeEvent('selectedRecordIds', this._selectedRecordIds));
  }

  /** Reactive records setter: cleans up stale selections */
  @api
  get records() {
    return this._records;
  }
  set records(value) {
    const ids = (value || []).map(r => r.Id);
    this._records = Array.isArray(value) ? value : [];

    // Purge stale single
    if (this._selectedRecordId && !ids.includes(this._selectedRecordId)) {
      this.selectedRecordId = undefined;
    }
    // Purge stale multi
    const filtered = this._selectedRecordIds.filter((id) => ids.includes(id));
    if (filtered.length !== this._selectedRecordIds.length) {
      this.selectedRecordIds = filtered;
    }
  }

  /** Describe metadata for field labels */
  @wire(getObjectInfo, { objectApiName: '$objectApiName' })
  objectInfo;

  connectedCallback() {
    // When Flow navigates back here, clear any previous buttonValue
    this.buttonValue = undefined;
  }

  /** Handle tile clicks by writing to selectedRecordId(s) */
  handleTileClick(evt) {
    const recId = evt.currentTarget.dataset.recordid;

    switch (this.clickMode) {
      case 'singleSelect':
        this.selectedRecordId  = recId;
        this.selectedRecordIds = [];
        break;
      case 'singleAutoNavigate':
        this.selectedRecordId  = recId;
        this.selectedRecordIds = [];
        this.autoNavigate();
        break;
      case 'multiSelect':
        const arr = this.selectedRecordIds.slice();
        if (arr.includes(recId)) {
          arr.splice(arr.indexOf(recId), 1);
        } else {
          arr.push(recId);
        }
        this.selectedRecordIds = arr;
        break;
      // viewOnly: no action
    }
  }

  /** Handle a button cell click */
  handleButtonClick(evt) {
    evt.stopPropagation(); // prevent the underlying tile’s click
    const btnValue = evt.currentTarget.dataset.btnvalue;
    const recId    = evt.currentTarget.dataset.recordid;

    // Always set selectedRecordId to the row whose button was clicked
    this.selectedRecordId = recId;

    // If singleSelect or singleAutoNavigate, clear multi‐select array
    if (this.clickMode === 'singleSelect' || this.clickMode === 'singleAutoNavigate') {
      this.selectedRecordIds = [];
    }

    this.buttonValue = btnValue;
    this.autoNavigate();
  }

  /** Dispatch Next/Finish based on Flow’s availableActions */
  autoNavigate() {
    if (this.availableActions.includes('NEXT')) {
      this.dispatchEvent(new FlowNavigationNextEvent());
    } else if (this.availableActions.includes('FINISH')) {
      this.dispatchEvent(new FlowNavigationFinishEvent());
    } else {
      console.error('Cannot autoNavigate—availableActions=', this.availableActions);
    }
  }

  /** ───── Helpers for styling & layout ───── */

  get hasData() {
    return Array.isArray(this.records) && this.records.length > 0;
  }

  /** CSS variables for the root container */
  get rootStyleComputed() {
    let vars = '';
    if (this.tileGap)                vars += `--tile-gap: ${this.tileGap};`;
    if (this.tileBorder)             vars += `--tile-border: ${this.tileBorder};`;
    if (this.tileHoverStyle)         vars += `--tile-hover: ${this.tileHoverStyle};`;
    if (this.tileSelectedBorder)     vars += `--tile-selected-border: ${this.tileSelectedBorder};`;
    if (this.tileSelectedBackground) vars += `--tile-selected-bg: ${this.tileSelectedBackground};`;
    return vars;
  }

  /** CSS‐grid template for placing tiles */
  get containerStyle() {
    if (this.numColumns) {
      return `grid-template-columns: repeat(${this.numColumns},1fr);`;
    }
    const min = this.minWidth  || '250px';
    const max = this.maxWidth  || '1fr';
    return `grid-template-columns: repeat(auto-fill,minmax(${min},${max}));`;
  }

  /** Base tile style (sizing) */
  get tileStyleComputed() {
    let s = this.tileStyle;
    if (this.minWidth)   s += `min-width: ${this.minWidth};`;
    if (this.maxWidth)   s += `max-width: ${this.maxWidth};`;
    if (this.minHeight)  s += `min-height: ${this.minHeight};`;
    if (this.maxHeight)  s += `max-height: ${this.maxHeight};`;
    return s;
  }

  /** Parse the layoutConfig JSON */
  get config() {
    try {
      return JSON.parse(this.layoutConfig) || {};
    } catch {
      return {};
    }
  }

  /** “wrapper” for each tile: a grid of columns inside that tile */
  get wrapperGridStyle() {
    const cols   = (this.config.columns || []).length || 1;
    const vAlign = V_MAP[this.config.alignment?.v] || 'start';
    return `
      display: grid;
      grid-gap: 0.5rem;
      grid-template-columns: repeat(${cols},1fr);
      align-content: ${vAlign};
    `;
  }

  /** Each tile’s style (excluding selected effects) */
  computeWrapperStyle(isSelected) {
    let style = this.wrapperGridStyle + this.tileStyleComputed;
    if (isSelected && this.selectedTileStyle) {
      style += this.selectedTileStyle;
    }
    return style;
  }

  /** Combine root CSS vars + container grid into a single style string */
  get rootAndContainerStyle() {
    return this.rootStyleComputed + this.containerStyle;
  }

  /** Build all nested columns/rows/cells, supporting per‐cell alignment and button cells */
  get processedRecords() {
    const fields = this.objectInfo.data?.fields || {};

    return this.records.map((rec) => {
      const singleSel = rec.Id === this.selectedRecordId;
      const multiSel  = this.selectedRecordIds.includes(rec.Id);
      const isSel     =
        this.clickMode === 'multiSelect'
          ? multiSel
          : this.clickMode.startsWith('single')
          ? singleSel
          : false;

      // Combine base + custom tileClass + “selected” if needed
      const wrapperClass = ['tile-wrapper', this.tileClass, isSel ? 'selected' : '']
        .filter(Boolean)
        .join(' ');

      return {
        id: rec.Id,
        wrapperClass,
        wrapperStyle: this.computeWrapperStyle(isSel),
        columns: (this.config.columns || []).map((col, cIdx) => ({
          id: `${rec.Id}-col-${cIdx}`,
          rows: (col.rows || []).map((row, rIdx) => {
            const alignment   = row.alignment;
            const perCellAlign = Array.isArray(alignment);

            let rowStyle = '';
            if (perCellAlign) {
              // Per‐cell alignment → no justify‐content on row
              rowStyle = `
                display: grid;
                grid-auto-flow: column;
                column-gap: 0.5rem;
              `;
            } else {
              // Uniform row‐level alignment
              const h = H_MAP[alignment?.h] || 'start';
              rowStyle = `
                display: grid;
                grid-auto-flow: column;
                column-gap: 0.5rem;
                justify-content: ${h};
              `;
            }

            const cells = (row.columns || []).map((cell, xIdx) => {
              // ── BUTTON cell ───────────────────────────────────────────────────
              if (cell.type === 'button') {
                // Extract SLDS “variant” from JSON buttonStyle:
                // Example JSON → "buttonStyle": "slds-button_brand"
                // We split at "slds-button_" and take the suffix (e.g. "brand").
                let variant = 'neutral';
                if ((cell.buttonStyle || '').includes('slds-button_brand')) {
                  variant = 'brand';
                } else if ((cell.buttonStyle || '').includes('slds-button_destructive')) {
                  variant = 'destructive';
                }

                // Combine OverrideButtonStyle + labelStyle into single inline string
                const combinedStyle = [cell.OverrideButtonStyle || '', cell.labelStyle || '']
                  .filter(Boolean)
                  .join(' ');

                // If JSON “label” is empty, treat as icon-only
                const isIconOnly = !cell.label;

                // Build <lightning-button-icon> class dynamically from JSON’s buttonStyle
                // If buttonStyle="slds-button_destructive", then suffix="destructive" → iconClass="slds-button_icon slds-button_icon-destructive"
                let iconClass = '';
                if (isIconOnly && cell.buttonStyle?.startsWith('slds-button_')) {
                  const suffix = cell.buttonStyle.split('slds-button_')[1]; // e.g. "destructive", "outline-brand"
                  iconClass = ['slds-button_icon', `slds-button_icon-${suffix}`].join(' ');
                }

                return {
                  id: `${rec.Id}-col-${cIdx}-row-${rIdx}-button-${xIdx}`,
                  isButton: true,
                  isIconOnly,
                  label: cell.label || '',
                  value: cell.value,
                  computedVariant: variant,
                  iconName: cell.icon || '',
                  iconPosition: cell.iconPosition || 'left',
                  combinedStyle,
                  recordId: rec.Id,
                  iconClass
                };
              }

              // ── NORMAL field/text cell ─────────────────────────────────────────
              const rawValue = cell.type === 'field' ? rec[cell.value] : cell.value;
              const cellLabel = cell.showLabel ? (fields[cell.value]?.label || cell.value) : '';

              // “style” from JSON for this text cell
              let cellStyle = cell.style || '';
              if (perCellAlign) {
                const cellAlignObj = alignment[xIdx] || {};
                const justifySelf = H_MAP[cellAlignObj.h] || 'start';
                cellStyle += ` justify-self: ${justifySelf};`;
              }

              return {
                id: `${rec.Id}-col-${cIdx}-row-${rIdx}-cell-${xIdx}`,
                isButton: false,
                showLabel: cell.showLabel,
                labelStyle: cell.labelStyle || '',
                cellStyle,
                displayLabel: cellLabel,
                displayValue: rawValue
              };
            });

            return {
              id: `${rec.Id}-col-${cIdx}-row-${rIdx}`,
              rowStyle,
              cells
            };
          })
        }))
      };
    });
  }
}

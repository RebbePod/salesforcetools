// force-app/main/default/lwc/flowReactiveTileList/flowReactiveTileList.js
import { LightningElement, api, wire } from 'lwc';
import {
  FlowAttributeChangeEvent,
  FlowNavigationNextEvent,
  FlowNavigationFinishEvent
} from 'lightning/flowSupport';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

const H_MAP = { left: 'start', center: 'center', right: 'end' };
const V_MAP = { top: 'start', middle: 'center', bottom: 'end' };

export default class FlowReactiveTileList extends LightningElement {
  // backing fields
  _records = [];
  _selectedRecordId;
  _selectedRecordIds = [];

  /** Flow inputs */
  @api objectApiName;
  @api layoutConfig;
  @api clickMode            = 'viewOnly'; // viewOnly|singleSelect|multiSelect|singleAutoNavigate
  @api numColumns;
  @api minWidth;
  @api maxWidth;
  @api minHeight;
  @api maxHeight;

  /** NEW: Custom CSS overrides */
  @api tileClass            = '';
  @api tileStyle            = '';
  @api tileGap              = '';  // e.g. "2rem" or "16px"
  @api tileBorder           = '';  // e.g. "2px dashed red"
  @api tileHoverStyle       = '';  // e.g. "box-shadow:0 4px 8px rgba(0,0,0,0.2);"
  @api tileSelectedBorder   = '';  // e.g. "3px solid green"
  @api tileSelectedBackground = ''; // e.g. "#ffebcc"

  @api selectedTileStyle    = '';   // additional CSS for selected card
  @api availableActions     = [];   // for autoNavigate

  /** Flow‐bound selection (two‐way) */
  @api
  get selectedRecordId() {
    return this._selectedRecordId;
  }
  set selectedRecordId(val) {
    this._selectedRecordId = val;
    console.log('selectedRecordId setter invoked, new value:', val);
    this.dispatchEvent(new FlowAttributeChangeEvent('selectedRecordId', val));
  }

  @api
  get selectedRecordIds() {
    return this._selectedRecordIds;
  }
  set selectedRecordIds(val) {
    this._selectedRecordIds = Array.isArray(val) ? val : [];
    console.log('selectedRecordIds setter invoked, new value:', this._selectedRecordIds);
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
    const filtered = this._selectedRecordIds.filter(id => ids.includes(id));
    if (filtered.length !== this._selectedRecordIds.length) {
      this.selectedRecordIds = filtered;
    }
  }

  /** Describe metadata for field labels */
  @wire(getObjectInfo, { objectApiName: '$objectApiName' })
  objectInfo;

  connectedCallback() {
    // No defaultRecordId logic here—Flow binds selectedRecordId directly
  }

  /** Handle tile clicks by writing to the public props */
  handleTileClick(evt) {
    const recId = evt.currentTarget.dataset.recordid;
    console.log('Tile clicked, id:', recId);

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

    console.log('→ Flow‐bound selectedRecordId:', this.selectedRecordId);
    console.log('→ Flow‐bound selectedRecordIds:', this.selectedRecordIds);
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

  /** Build CSS variables for the root container */
  get rootStyleComputed() {
    let vars = '';

    if (this.tileGap) {
      vars += `--tile-gap: ${this.tileGap};`;
    }
    if (this.tileBorder) {
      vars += `--tile-border: ${this.tileBorder};`;
    }
    if (this.tileHoverStyle) {
      vars += `--tile-hover: ${this.tileHoverStyle};`;
    }
    if (this.tileSelectedBorder) {
      vars += `--tile-selected-border: ${this.tileSelectedBorder};`;
    }
    if (this.tileSelectedBackground) {
      vars += `--tile-selected-bg: ${this.tileSelectedBackground};`;
    }
    return vars;
  }

  /** Compute the CSS‐grid template for placing tiles */
  get containerStyle() {
    if (this.numColumns) {
      return `grid-template-columns: repeat(${this.numColumns},1fr);`;
    }
    const min = this.minWidth || '250px';
    const max = this.maxWidth || '1fr';
    return `grid-template-columns: repeat(auto-fill,minmax(${min},${max}));`;
  }

  /** Base tile style (sizing) */
  get tileStyleComputed() {
    let s = this.tileStyle;
    if (this.minWidth)  s += `min-width: ${this.minWidth};`;
    if (this.maxWidth)  s += `max-width: ${this.maxWidth};`;
    if (this.minHeight) s += `min-height: ${this.minHeight};`;
    if (this.maxHeight) s += `max-height: ${this.maxHeight};`;
    return s;
  }

  /** Safely parse the layoutConfig JSON */
  get config() {
    try {
      return JSON.parse(this.layoutConfig) || {};
    } catch {
      return {};
    }
  }

  /** Build the grid‐within‐a‐tile (columns inside each tile) */
  get wrapperGridStyle() {
    const cols = (this.config.columns || []).length || 1;
    const vAlign = V_MAP[this.config.alignment?.v] || 'start';
    return `
      display: grid;
      grid-gap: 0.5rem;
      grid-template-columns: repeat(${cols},1fr);
      align-content: ${vAlign};
    `;
  }

  /** Build each tile’s style string excluding selection effects */
  computeWrapperStyle(isSelected) {
    let style = this.wrapperGridStyle + this.tileStyleComputed;
    if (isSelected) {
      if (this.selectedTileStyle) {
        style += this.selectedTileStyle;
      }
    }
    return style;
  }

  /** Combine root CSS vars + container grid into one style string */
  get rootAndContainerStyle() {
    return this.rootStyleComputed + this.containerStyle;
  }

  /** Build all nested columns/rows/cells, supporting per‐cell alignment */
  get processedRecords() {
    const fields = this.objectInfo.data?.fields || {};

    return this.records.map(rec => {
      const singleSel = rec.Id === this.selectedRecordId;
      const multiSel  = this.selectedRecordIds.includes(rec.Id);
      const isSel     = this.clickMode === 'multiSelect'
                        ? multiSel
                        : this.clickMode.startsWith('single')
                          ? singleSel
                          : false;

      // Combine base class + custom tileClass + selected
      const wrapperClass = ['tile-wrapper', this.tileClass, isSel ? 'selected' : '']
        .filter(Boolean)
        .join(' ');

      return {
        id:           rec.Id,
        wrapperClass,
        wrapperStyle: this.computeWrapperStyle(isSel),
        columns:      (this.config.columns || []).map((col, cIdx) => ({
          id:   `${rec.Id}-col-${cIdx}`,
          rows: (col.rows || []).map((row, rIdx) => {
            const alignment = row.alignment;
            const perCellAlign = Array.isArray(alignment);

            let rowStyle = '';
            if (perCellAlign) {
              // Per‐cell alignment: row container has no justify-content
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
              const rawValue = cell.type === 'field'
                ? rec[cell.value]
                : cell.value;
              const cellLabel = cell.showLabel
                ? (fields[cell.value]?.label || cell.value)
                : '';

              // Now read from cell.style (JSON’s "style") instead of formattingStyle
              let cellStyle = cell.style || '';
              if (perCellAlign) {
                const cellAlignObj = alignment[xIdx] || {};
                const justifySelf = H_MAP[cellAlignObj.h] || 'start';
                cellStyle += ` justify-self: ${justifySelf};`;
              }

              return {
                id:              `${rec.Id}-col-${cIdx}-row-${rIdx}-cell-${xIdx}`,
                showLabel:       cell.showLabel,
                labelStyle:      cell.labelStyle || '',
                cellStyle,       // includes JSON’s "style" now
                displayLabel:    cellLabel,
                displayValue:    rawValue
              };
            });

            return {
              id:       `${rec.Id}-col-${cIdx}-row-${rIdx}`,
              rowStyle,
              cells
            };
          })
        }))
      };
    });
  }
}

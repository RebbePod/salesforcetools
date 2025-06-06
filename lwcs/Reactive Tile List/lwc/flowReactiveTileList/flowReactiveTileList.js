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
  @api tileClass            = '';
  @api tileStyle            = '';
  @api selectedTileStyle    = '';       // CSS overrides for selected cards
  @api availableActions     = [];       // for autoNavigate

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

  /** Reactive records setter cleans up any stale selections */
  @api
  get records() {
    return this._records;
  }
  set records(value) {
    const ids = (value || []).map(r => r.Id);
    this._records = Array.isArray(value) ? value : [];

    // purge stale single
    if (this._selectedRecordId && !ids.includes(this._selectedRecordId)) {
      this.selectedRecordId = undefined;
    }
    // purge stale multi
    const filtered = this._selectedRecordIds.filter(id => ids.includes(id));
    if (filtered.length !== this._selectedRecordIds.length) {
      this.selectedRecordIds = filtered;
    }
  }

  /** Describe metadata for field labels */
  @wire(getObjectInfo, { objectApiName: '$objectApiName' })
  objectInfo;

  connectedCallback() {
    // No defaultRecordId logic now—Flow input directly binds selectedRecordId
  }

  /** Handle tile clicks by writing to public properties */
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
      // viewOnly: no changes
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

  get containerStyle() {
    if (this.numColumns) {
      return `grid-template-columns: repeat(${this.numColumns},1fr);`;
    }
    const min = this.minWidth || '250px';
    const max = this.maxWidth || '1fr';
    return `grid-template-columns: repeat(auto-fill,minmax(${min},${max}));`;
  }

  get tileStyleComputed() {
    let s = this.tileStyle;
    if (this.minWidth)  s += `min-width:${this.minWidth};`;
    if (this.maxWidth)  s += `max-width:${this.maxWidth};`;
    if (this.minHeight) s += `min-height:${this.minHeight};`;
    if (this.maxHeight) s += `max-height:${this.maxHeight};`;
    return s;
  }

  get config() {
    try {
      return JSON.parse(this.layoutConfig) || {};
    } catch {
      return {};
    }
  }

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

  computeWrapperStyle(isSelected) {
    let style = this.wrapperGridStyle + this.tileStyleComputed;
    if (isSelected) {
      style += `
        border: 2px solid #0070d2 !important;
        background-color: #e8f4ff !important;
      `;
      if (this.selectedTileStyle) {
        style += this.selectedTileStyle;
      }
    }
    return style;
  }

  /** Build nested columns/rows for rendering, honoring new alignment schema */
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

      // include the custom tileClass
      const wrapperClass = ['tile-wrapper', this.tileClass, isSel ? 'selected' : '']
        .filter(Boolean)
        .join(' ');

      return {
        id:            rec.Id,
        wrapperClass,
        wrapperStyle:  this.computeWrapperStyle(isSel),
        columns:       (this.config.columns || []).map((col, cIdx) => ({
          id:   `${rec.Id}-col-${cIdx}`,
          rows: (col.rows || []).map((row, rIdx) => {
            const alignment = row.alignment;
            let rowStyle = '';
            let perCellAlign = Array.isArray(alignment);

            if (perCellAlign) {
              // no justify-content at row level
              rowStyle = `
                display: grid;
                grid-auto-flow: column;
                column-gap: 0.5rem;
              `;
            } else {
              // uniform row-level alignment
              const h = H_MAP[alignment?.h] || 'start';
              rowStyle = `
                display: grid;
                grid-auto-flow: column;
                column-gap: 0.5rem;
                justify-content: ${h};
              `;
            }

            const cells = (row.columns || []).map((cell, xIdx) => {
              const rawValue = cell.type === 'field' ? rec[cell.value] : cell.value;
              const cellLabel = cell.showLabel
                ? (fields[cell.value]?.label || cell.value)
                : '';

              let cellStyle = cell.formattingStyle || '';
              if (perCellAlign) {
                // apply per-cell justify-self
                const cellAlignObj = alignment[xIdx] || {};
                const justifySelf = H_MAP[cellAlignObj.h] || 'start';
                cellStyle += ` justify-self: ${justifySelf};`;
              }

              return {
                id:            `${rec.Id}-col-${cIdx}-row-${rIdx}-cell-${xIdx}`,
                showLabel:     cell.showLabel,
                labelStyle:    cell.labelStyle || '',
                formattingStyle: cell.formattingStyle || '',
                cellStyle,   // include justify-self if needed
                displayLabel:  cellLabel,
                displayValue:  rawValue
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

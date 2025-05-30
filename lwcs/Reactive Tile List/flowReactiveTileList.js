import { LightningElement, api, wire } from 'lwc';
import { getObjectInfo }       from 'lightning/uiObjectInfoApi';

const H_MAP = { left: 'start', center: 'center', right: 'end' };
const V_MAP = { top: 'start', middle: 'center', bottom: 'end' };

export default class FlowReactiveTileList extends LightningElement {
    @api records = [];
    @api objectApiName;
    @api layoutConfig;
    @api numColumns;
    @api minWidth;
    @api maxWidth;
    @api minHeight;
    @api maxHeight;
    @api tileClass = '';
    @api tileStyle = '';

    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    objectInfo;

    get hasData() {
        return Array.isArray(this.records) && this.records.length > 0;
    }

    get containerStyle() {
        if (this.numColumns) {
            return `grid-template-columns: repeat(${this.numColumns},1fr);`;
        }
        const min = this.minWidth  || '250px';
        const max = this.maxWidth  || '1fr';
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
        try { return JSON.parse(this.layoutConfig) || {}; }
        catch { return {}; }
    }

    get wrapperStyleComputed() {
        const cols   = (this.config.columns || []).length || 1;
        const vAlign = V_MAP[this.config.alignment?.v]     || 'start';
        return `
          display: grid;
          grid-gap: 0.5rem;
          grid-template-columns: repeat(${cols},1fr);
          align-content: ${vAlign};
          ${this.tileStyleComputed}
        `;
    }

    get processedRecords() {
        const fields = this.objectInfo.data?.fields || {};
        return this.records.map(rec => ({
            id: rec.Id,
            columns: (this.config.columns || []).map((col, cIdx) => ({
                id: `${rec.Id}-col-${cIdx}`,
                rows: (col.rows || []).map((row, rIdx) => {
                    const hAlign = H_MAP[row.alignment?.h] || 'start';
                    return {
                        id: `${rec.Id}-col-${cIdx}-row-${rIdx}`,
                        rowStyle: `
                          display: grid;
                          grid-auto-flow: column;
                          column-gap: 0.5rem;
                          justify-content: ${hAlign};
                        `,
                        cells: (row.columns || []).map((cell, xIdx) => {
                            // raw text or field value
                            const rawValue = cell.type === 'field'
                                ? rec[cell.value]
                                : cell.value;
                            // human label from describe
                            const fieldLabel = cell.type === 'field'
                                ? (fields[cell.value]?.label || cell.value)
                                : '';
                            // formatting for cell content
                            const formattingStyle = cell.style || '';
                            // formatting for label
                            const labelStyle      = cell.labelStyle || '';

                            return {
                                id:            `${rec.Id}-col-${cIdx}-row-${rIdx}-cell-${xIdx}`,
                                showLabel:     cell.showLabel === true,
                                displayLabel:  cell.showLabel === true 
                                               ? fieldLabel 
                                               : '',
                                displayValue:  rawValue,
                                formattingStyle,
                                labelStyle
                            };
                        })
                    };
                })
            }))
        }));
    }
}

import {ComponentRenderer} from "./renderer.js"


export class Table extends ComponentRenderer {
    constructor(data) {
        super(data)
        this.navigator = new Navigator(data)
        this.filters = new Filters(data)
        this.info = new Info(data)
        this.thead = new Thead(data)
        this.tbody = new Tbody(data)
    }

    render(start, nrows) {
        return `<div class="moedertabel__explorer__records">
            ${this.navigator.render()}
            ${this.filters.render()}
            ${this.info.render(start, nrows)}
            <div class="moedertabel__explorer__table">
            <table>
                ${this.thead.render()}
                ${this.tbody.render(start, nrows)}
            </table>
            </div>
        </div>`
    }
}


class Navigator extends ComponentRenderer {
    render() {
        return `<div class="moedertabel__explorer__navigator">
            <select data-view-nrows>
                <option value="5">toon 5 records</option>>
                <option value="10">toon 10 records</option>>
                <option value="25" selected>toon 25 records</option>
                <option value="100">toon 100 records</option>
                <option value="250">toon 250 records</option>
                <option value="500">toon 500 records</option>
            </select>
            <button data-navigate="first"><span>first</span></button>
            <button data-navigate="next"><span>next</span></button>
            <button data-navigate="prev"><span>prev</span></button>
            <button data-navigate="last"><span>last</span></button>
        </div>`
    }
}


class Filters extends ComponentRenderer {
    render() {
        let labeledCols = this.mapLevelColsToLabels(1)
        let content = []
        for (let [label, cols] of labeledCols) {
            content.push(this.renderLabel(label, cols))
        }
        return `<div class="moedertabel__explorer__filters">
            <div data-hide-target="moedertabel__explorer__filters" class="panel"><span>Filters</span></div>
            <div data-label="moedertabel__explorer__filters">
                ${this.renderIndex()}
                ${content.join('')}
            </div>
        </div>`
    }

    renderIndex() {
        let dtypes = this.data.dtypes.index
        let names = this.data.axes.index
        return `<div
            data-hide-target="index"
            class="panel">
            Index
        </div>
        <div
            data-label="index"
            class="moedertabel__explorer__filters__fields__grid">
            ${this.data.indexNames.map((name, idx) => `<div>${name}<code>${this.data.indexDTypes[idx]}</code></div>
            <div>
                <input
                    data-filter-target="index-${idx}"
                    placeholder="filter..."></input>
                <button data-clear-filter>&#215;</button>
            </div>`).join('')}
        </div>`
    }

    renderLabel(label, cols) {
        let flatColumns = this.data.columns.map(i => i[1])
        let dtypes = this.mapDTypesToCols(1)
        return `<div
            data-hide-target="${label}"
            class="panel">
            ${label}
        </div>
        <div
            data-label="${label}"
            class="moedertabel__explorer__filters__fields__grid">
            ${cols.map((col, idx) => `<div>${col}<code>${dtypes[col]}</code></div>
            <div>
                <input
                data-filter-target="columns-${flatColumns.indexOf(col)}"
                placeholder="filter..."></input>
                <button data-clear-filter>&#215;</button>
            </div>`).join('')}
        </div>`
    }
}


export class Info extends ComponentRenderer {
    render(start, nrows) {
        let end = start + nrows
        let filterInfo = this.data.isFiltered ? `[filtered from <code>${this.data.length}</code> records total]` : ""
        return `<div class="moedertabel__explorer__info">
            <div>Moedertabel Explorer</div>
            <div data-table-info>
                showing <code>${nrows}</code> records
                (<code>${start}-${end}</code>)
                of <code>${this.data.lengthView}</code> records
                ${filterInfo}
            </div>
        </div>`
    }
}


class Thead extends ComponentRenderer {
    render() {
        let n = 0
        let rows = []
        let row
        let items
        while (n < this.nlevCols) {
            items = this.getLevelValues(n)
            row = this.renderLevelHeader(items, n)
            if (n === 0) {
                let spans = this.renderHeaderSpans(items)
                row = row.map((val, i) => spans[i] + val)
            }
            row = this.addAxisNameColumn(row, n)
            rows.push(row.join(""))
            n++
        }
        let inputs = this.renderColInputs().join("")
        inputs = this.addAxisNameIndex(inputs)
        rows.push(inputs)

        return `<thead>${rows.map(row => `<tr>${row}</tr>`).join("")}</thead>`
    }

    getLevelValues(level) {
        let values = this.data.columns.map(i => i[level])
        return this.getContiguousValueCounts(values)
    }

    renderLevelHeader(values, level) {
        let labels = this.mapLevelLabelsToCol(level)
        let getTh = i => {
            return `<th
                data-label="${labels[i.value] ? labels[i.value] : i.value}"
                ${i.count > 1 ? ` colspan="${i.count}"` : ""}>
                ${i.value}
            </th>` }
        return values.map(getTh)
    }

    renderColInputs() {
        let labels = this.mapLevelLabelsToLoc(0)
        let getTh = i => {
            return `<th
                data-label="${labels[i]}">
                <span data-copy-target="columns-${i}">&#x23CD;</span>
                <span data-sort-target="columns-${i}">&#9651;</span>
                <span data-sort-target="columns-${i}" desc>&#9661;</span>
            </th>` }
        return this.data.columns.map((_, i) => getTh(i))
    }

    addAxisNameColumn(row, level) {
        let axisName = `<th
            colspan="${this.nlevRows + 1}"
            data-index-name>
            ${this.data.columnNames[level]}
        </th>`
        row.unshift(axisName)
        return row
    }

    addAxisNameIndex(row) {
        let addSpan = i => i === 0 ? ' colspan="2"' : ''
        let names = this.data.indexNames
            .map((name, i) => {
                return `<th${addSpan(i)} data-index-name>
                    <span data-copy-target="index-${i}">&#x23CD;</span>
                    <span data-sort-target="index-${i}">&#9651;</span>
                    <span data-sort-target="index-${i}" desc>&#9661;</span>
                    ${name}
                </th>` })
            .join("")
        return names + row
    }

    renderHeaderSpans(values) {
        let nlevel = this.nlevCols + 1
        let addAttr = i => {
            return `<th
                data-hide-target="${i.value}"
                rowspan="${nlevel}"
                class="panel">
            </th>` }
        return values.map(addAttr)
    }
}


export class Tbody extends ComponentRenderer {
    render(start, nrows) {
        if (this.data.dataview.length === 0) { return `<tbody></tbody>` }
        let index = this.renderIndeces(start, nrows)
        let rows = this.renderRows(start, nrows)
        rows = rows.map((row, idx) => index[idx] + row)
        return `<tbody>${rows.map(row => `<tr>${row}</tr>`).join("")}</tbody>`
    }

    renderRows(start, nrows) {
        let spans = this.mapLevelLabelsToSpans(0)
        let labels = this.mapLevelLabelsToLoc(0)
        let getTd = (val, i) => {
            let dtype = this.data.dtypes.columns[i]
            return `<td
                data-label="${labels[i]}"
                data-dtype="${dtype}">
                ${Tbody.format(val, dtype)}
            </td>` }
        let getPanel = i => {
            return `<th
                data-hide-target="${spans[i]}"
                rowspan="${nrows}"
                class="panel">
                <span>${spans[i]}</span>
            </th>` }
        let getPanelIfFirst = i => i in spans ? getPanel(i) : ''

        let row0 = this.getData(start, nrows)[0]
            .map((val, i) => getPanelIfFirst(i) + getTd(val, i))
            .join("")
        let rows = this.getData(start, nrows)
            .slice(1)
            .map(row => row.map((val, i) => getTd(val, i))
                .join(""))
        rows.unshift(row0)
        return rows
    }

    renderIndeces(start, nrows) {
        let index = this.getIndeces(start, nrows)
        if (!Array.isArray(index[0])) { index = index.map(i => [i]) }
        return index.map((row, idxRow) => {
            return row.map((item, idxItem) => {
                return `${idxItem === 0 ? `<th data-record-target="${idxRow}">&#9654;</th>` : ''}<th>${item}</th>`
            }).join("")
        })
    }

    getData(start, nrows) {
        let end = start + nrows
        return this.data.dataview.slice(start, end)
    }

    getIndeces(start, nrows) {
        let end = start + nrows
        return this.data.indexview.slice(start, end)
    }
}


export class Details extends ComponentRenderer {
    getElement(n) {
        let el = document.createElement("div")
        el.innerHTML = this.render(n)
        return el.firstElementChild
    }

    render(n) {
        let labeledCols = this.mapLevelColsToLabels(1)
        let dtypesPerCol = this.mapDTypesToCols(1)
        let rowData = this.mapRowDataToCols(n, 1)
        let content = []
        for (let [label, cols] of labeledCols) {
            content.push(this.renderLabel(rowData, dtypesPerCol, label, cols))
        }
        return `<div class="moedertabel__explorer__details">
            <div class="moedertabel__explorer__details__header">
                Record <code>${this.renderIndexOfRow(n)}</code>
                <button data-table-target>&#8801;</button>
                <button data-record-target="${n - 1}">&#9668;</button>
                <button data-record-target="${n + 1}">&#9658;</button>
            </div>
            <div class="moedertabel__explorer__details__data">
                ${content.join('')}
            </div>
        </div>`
    }

    renderIndexOfRow(n) {
        let indexOfRow = this.data.index[n]
        if (!Array.isArray(indexOfRow)) { indexOfRow = [indexOfRow] }
        return `<code>${indexOfRow.join(' | ')}</code>`
    }

    renderLabel(data, dtypes, label, cols) {
        return `<div
            data-hide-target="${label}"
            class="panel">
            <span>${label}</span>
        </div>
        <div
            data-label="${label}"
            class="moedertabel__explorer__details__data__grid">
            ${cols.map(col => this.renderFieldData(col, data, dtypes)).join('')}
        </div>`
    }

    renderFieldData(col, data, dtypes) {
        return `<div>${col}</div>
        <div
        data-dtype="${dtypes[col]}">
            ${Details.format(data[col], dtypes[col])}
        </div>`
    }
}

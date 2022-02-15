class MoedertabelExplorerBuilder {
    constructor(explorer, data) {
        this.explorer = explorer
        this.data = data
        this.table = new TableRenderer(data)
        this.details = new DetailsRenderer(data)
        this.hiddenLabels = ["moedertabel__explorer__filters"]
        this.start = 0
        this.nrows = 25
    }

    get appliedColumnFilters() { return this.getValuesFromInputs(`[data-filter-target^="columns"]`) }

    get appliedIndexFilters() { return this.getValuesFromInputs(`[data-filter-target^="index"]`) }

    getValuesFromInputs(selector) {
        let arr = []
        let targets = this.explorer.querySelectorAll(selector)
        targets.forEach(i => arr.push(i.value))
        return arr
    }

    build() {
        let table = this.table.getElement()
        this.explorer.appendChild(table)
        this.explorer.addEventListener("change", this.updateNRows.bind(this))
        this.explorer.addEventListener("click", this.updateStart.bind(this))
        this.explorer.addEventListener("click", this.updateHiddenLabels.bind(this))
        this.explorer.addEventListener("click", this.showDetails.bind(this))
        this.explorer.addEventListener("click", this.showTable.bind(this))
        this.explorer.addEventListener("click", this.copyColumnData.bind(this))
        this.explorer.addEventListener("click", this.updateSort.bind(this))
        this.explorer.addEventListener("click", this.clearFilter.bind(this))
        this.explorer.addEventListener("keyup", this.updateFilters.bind(this))
        this.hideLabels()
        this.fixateHeaders()
    }

    // SHOW TABLE/DETAILS
    showTable(event) {
        if (!event.target.matches("[data-table-target]")) { return }
        this.explorer.querySelector(".moedertabel__explorer__details").remove()
        this.explorer.querySelector(".moedertabel__explorer__records").classList.remove("hide")
    }

    showDetails(event) {
        if (!event.target.matches("[data-record-target]")) { return }
        let target = event.target.dataset.recordTarget
        this.explorer.querySelector(".moedertabel__explorer__records").classList.add("hide")
        let details = this.details.getElement(target)
        let element = this.explorer.querySelector(".moedertabel__explorer__details")
        !!element ? element.replaceWith(details) : this.explorer.append(details)
    }

    updateData() {
        let renderer = new TbodyRenderer(this.data)
        let tbody = this.explorer.querySelector("tbody")
        tbody.innerHTML = renderer.render(this.start, this.nrows)
        this.fixateHeaders()
        this.hideLabels()
    }

    // HIDE LABELS
    updateHiddenLabels(event) {
        if (!event.target.matches("[data-hide-target], [data-hide-target] span")) { return }
        let target = event.target.dataset.hideTarget || event.target.parentElement.dataset.hideTarget
        if (this.hiddenLabels.includes(target)) {
            this.hiddenLabels = this.hiddenLabels.filter(i => i !== target)
        } else { this.hiddenLabels.push(target) }
        this.hideLabels()
    }

    hideLabels() {
        let targets = this.explorer.querySelectorAll("[data-label]")
        targets.forEach(el => {
            if (this.hiddenLabels.includes(el.dataset.label)) {
                el.classList.add("hide")
            } else (el.classList.remove("hide"))
        })
    }

    // NAVIGATE DATA
    updateNRows(event) {
        if (!event.target.matches("[data-view-nrows]")) { return }
        this.nrows = parseInt(event.target.value)
        this.updateData()
    }

    updateStart(event) {
        if (!event.target.matches("[data-navigate]")) { return }
        switch (event.target.dataset.navigate) {
            case "first":
                this.start = 0
                break
            case "next":
                this.start += this.nrows
                break
            case "prev":
                this.start -= this.nrows
                break
            case "last":
                this.start = this.data.dataview.length - this.nrows
                break
        }
        if (this.start < 0) {
            this.start = 0
        } else if (this.start >= this.data.dataview.length) {
            this.start = this.start - this.nrows
        }
        this.updateData()
    }

    // SORT DATA
    updateSort(event) {
        if (!event.target.matches("[data-sort-target]")) { return }
        this.start = 0
        let controle = event.target
        let [target, loc] = controle.dataset.sortTarget.split("-")
        let ascending = !controle.hasAttribute("desc")
        this.data.sortOnColumn(target, loc, ascending)
        this.data.filterData(this.appliedIndexFilters, this.appliedColumnFilters)
        this.updateData()
    }

    // FILTER DATA
    updateFilters(event) {
        if (!event.target.matches("[data-filter-target]")) { return }
        this.applyFilters()
    }

    clearFilter(event) {
        if (!event.target.matches("[data-clear-filter]")) { return }
        let controle = event.target
        controle.closest("div").querySelector("input").value = ""
        this.applyFilters()
    }

    applyFilters() {
        this.start = 0
        this.data.filterData(this.appliedIndexFilters, this.appliedColumnFilters)
        this.updateData()
    }

    // COPY DATA
    copyColumnData(event) {
        if (!event.target.matches("[data-copy-target]")) { return }
        let [start, end] = [this.start, this.start + this.nrows]
        let [target, loc] = event.target.dataset.copyTarget.split("-")
        let view = target == "index" ? "indexview" : "dataview"
        let arr = event.shiftKey ? this.data[view] : this.data[view].slice(start, end)
        let coldata = MoederData.getColumnByLoc(arr, loc).join(';')
        navigator.clipboard.writeText(coldata)
    }

    // STICKY HEADERS
    fixateHeaders() {
        // fixate column th's from thead to top side
        let thead = this.explorer.querySelector("thead")
        let prev = 0
        for (let row of thead.rows) {
            for (let cell of row.cells) { cell.style.top = `${prev}px` }
            prev += row.clientHeight
        }

        // fixate index th's from thead to left side
        prev = 0
        for (let row of thead.rows) {
            let cells = row.querySelectorAll("th[data-index-name]")
            for (let [idx, cell] of Object.entries(cells)) {
                cell.style.left = `${prev}px`
                let newWidth = cell.offsetWidth + parseInt(idx) + 1
                prev += newWidth
            }
            prev = 0
        }

        // fixate index th's from tbody to left side
        let tbody = this.explorer.querySelector("tbody")
        prev = 0
        for (let row of tbody.rows) {
            let cells = row.querySelectorAll(`th:not(.panel)`)
            for (let [idx, cell] of Object.entries(cells)) {
                cell.style.left = `${prev}px`
                let newWidth = cell.offsetWidth + parseInt(idx)
                prev += newWidth
            }
            prev = 0
        }
    }
}


class MoederData {
    constructor(spec) {
        this.axes = spec.axes
        this.columns = spec.columns
        this.dtypes = spec.dtypes
        this.index = spec.index
        this.data = spec.data
        this.dataview = spec.data
        this.indexview = spec.index
    }

    // INDEX PROPERTIES
    get index() {
        return MoederData.getAsArray(this._index)
    }

    set index(value) {
        this._index = value
    }

    get indexDTypes() {
        let dtypes = this.dtypes.index
        return Array.isArray(dtypes) ? dtypes : [dtypes]
    }

    get indexNames() {
        let names = this.axes.index
        return Array.isArray(names) ? names : [names]
    }

    // COLUMN PROPERTIES
    get columns() {
        return MoederData.getAsArray(this._columns)
    }

    set columns(value) {
        this._columns = value
    }

    get columnDTypes() {
        let dtypes = this.dtypes.columns
        return Array.isArray(dtypes) ? dtypes : [dtypes]
    }

    get columnNames() {
        let names = this.axes.columns
        return Array.isArray(names) ? names : [names]
    }

    // sorting applies to data directly
    // target is "index" or "columns", loc specifies position
    sortOnColumn(target, loc, ascending=true) {
        let data = target == "index" ? this.index : this.data
        let dtype = this.dtypes[target][loc]
        let sortMethod = MoederData.getSortMethod(dtype)
        let arr = MoederData.getColumnByLoc(data, loc).map((val, idx) => { return { index: idx, value: val } })
        arr.sort((a, b) => sortMethod(a, b, ascending=ascending))
        this.data = arr.map(item => this.data[item.index])
        this.index = arr.map(item => this.index[item.index])
    }

    // filtering applies to dataview
    createMask(idxFilters, colFilters) {
        let filterItemIndex = (el, idx) => {
            let filterMethod = MoederData.getFilterMethod(this.indexDTypes[idx])
            return idxFilters[idx] ? filterMethod(el, idxFilters[idx]) : true
        }
        let filterItemColumns = (el, idx, arr) => {
            let filterMethod = MoederData.getFilterMethod(this.columnDTypes[idx])
            return colFilters[idx] ? filterMethod(el, colFilters[idx]) : true
        }
        let idxMask = this.index.map(row => row.every((el, idx) => filterItemIndex(el, idx)))
        let colMask = this.data.map(row => row.every((el, idx) => filterItemColumns(el, idx)))
        return idxMask.map((val, idx) => val && colMask[idx])
    }

    filterData(idxFilters, colFilters) {
        if (idxFilters.some(i => i) || colFilters.some(i => i)) {
            let mask = this.createMask(idxFilters, colFilters)
            this.dataview = this.data.filter((_, idx) => mask[idx])
            this.indexview = this.index.filter((_, idx) => mask[idx])
        } else {
            this.dataview = this.data
            this.indexview = this.index
        }
    }

    // SORTING
    static getAsArray(arr) {
        if (Array.isArray(arr[0])) { return arr }
        return arr.map(i => [i])
    }

    static getColumnByLoc(arr, loc) {
        return MoederData.getAsArray(arr).map(i => i[loc])
    }

    static getSortMethod(dtype) {
        switch (dtype) {
            case "str":
                return MoederData.sortStrings
            case "cat":
                return MoederData.sortStrings
            default:
                return MoederData.sortDatesAndNumbers
        }
    }

    static sortStrings(a, b, ascending=true) {
        if (a.value < b.value) { return ascending ? -1 : 1 }
        if (a.value > b.value) { return ascending ? 1 : -1 }
    }

    static sortDatesAndNumbers(a, b, ascending=true) {
        return ascending ? a.value - b.value : b.value - a.value
    }

    // FILTERING
    static getFilterMethod(dtype) {
        switch (dtype) {
            case "str":
                return MoederData.filterStrings
            case "cat":
                return MoederData.filterStrings
            case "float":
                return MoederData.filterNumbers
            case "int":
                return MoederData.filterNumbers
            case "date":
                return MoederData.filterDates
            case "bool":
                return MoederData.filterStrings
        }
    }

    static filterStrings(item, filter) {
        let regex = new RegExp(filter, "i")
        return regex.test(item)
    }

    static filterBool(item, filter) {
        let regex = new RegExp(filter, "i")
        return regex.test(item.toString())
    }

    static filterDates(item, filter) {
        let itemDate = new Date(item)
        let regex = /([<>=]{1,2})(\d{2}).(\d{2}).(\d{4})/
        let [_, ops, day, month, year] = filter.match(regex) || ["", "", "", "", ""]
        let filterDate = ops ? new Date(year, month-1, day) : null
        switch (ops) {
            case "<":
                return itemDate < filterDate
            case "<=":
                return itemDate <= filterDate
            case ">":
                return itemDate > filterDate
            case ">=":
                return itemDate >= filterDate
            case "=":
                return itemDate.getTime() === filterDate.getTime()
            default:
                let toStr = i => i.toString().padStart(2, "0")
                item = `${toStr(itemDate.getDate())}-${toStr(itemDate.getMonth()+1)}-${itemDate.getFullYear()}`
                console.log(item)
                return item.toString().includes(filter)
        }
    }

    static filterNumbers(item, filter) {
        let regex = /([<>=]{1,2})(\d*)/
        let [_, ops, number] = filter.match(regex) || ["", "", ""]
        number = Number(number)
        switch (ops) {
            case "<":
                return item < number
            case "<=":
                return item <= number
            case ">":
                return item > number
            case ">=":
                return item >= number
            case "=":
                return item === number
            default:
                return item.toString().includes(filter)
        }
    }
}


class ComponentRenderer {
    constructor(data) {
        this.data = data
        this.nrows = data.dataview.length
        this.nlevCols = this.getNLevels(data.columns)
        this.nlevRows = this.getNLevels(data.index)
    }

    getElement() {
        let el = document.createElement("div")
        el.innerHTML = this.render()
        return el.firstElementChild
    }

    getNLevels(index) {
        let first = index[0]
        if (Array.isArray(first)) { return first.length }
        return 1
    }

    // reduces the values in an array to the number of contiguous occurrences of a value before it changes
    getContiguousValueCounts(arr) {
        let last
        return arr.reduce((acc, cur) => {
            if (last !== cur) {
                acc.push({ value: cur, count: 1 })
            } else {
                acc[acc.length - 1].count += 1
            }
            last = cur
            return acc
        }, [])
    }

    getLevelSpans(level) {
        let values = this.data.columns.map(i => i[level])
        return this.getContiguousValueCounts(values)
    }

    mapLevelLabelsToSpans(level) {
        let spans = this.getLevelSpans(level)
        let labels = {}
        let i = 0
        for (let span of spans) {
            labels[i] = span.value
            i += span.count
        }
        return labels
    }

    mapLevelLabelsToLoc(level) {
        let labels = this.data.columns.map(i => i[level])
        let mapping = {}
        for (let [i, label] of labels.entries()) {
            mapping[i] = label
        }
        return mapping
    }

    mapLevelLabelsToCol(level) {
        let mapping = {}
        for (let item of this.data.columns) {
            mapping[item[level]] = item[level - 1]
        }
        return mapping
    }

    mapLevelColsToLabels(level) {
        return this.data.columns.reduce((acc, cur) => {
            if (acc.has(cur[level - 1])) {
                acc.get(cur[level - 1]).push(cur[level])
            } else {
                acc.set(cur[level - 1], [cur[level]])
            }
            return acc
        }, new Map)
    }

    mapRowDataToCols(n, level) {
        let rowData = {}
        this.data.dataview[n].forEach((val, idx) => rowData[this.data.columns[idx][level]] = val)
        return rowData
    }

    mapDTypesToCols(level) {
        let DTypes = {}
        this.data.dtypes.columns.forEach((val, idx) => DTypes[this.data.columns[idx][level]] = val)
        return DTypes
    }

    getRowNumber(n) {
        if (n < 0) { return this.nrows - 1 }
        if (n >= this.nrows) { return 0 }
        return n
    }

    static format(value, dtype) {
        if (!value) { return '<span class="isna">-</span>' }
        switch (dtype) {
            case "str":
                return value
            case "cat":
                return value
            case "bool":
                return value
            case "int":
                return value
            case "float":
                return value
            case "date":
                value = new Date(value)
                let dt = new Intl.DateTimeFormat("nl", {
                    timeStyle: "short",
                    dateStyle: "short",
                    timeZone: "Europe/Amsterdam"
                })
                value = dt.format(value)
                if (value.includes("00:00")) { value = value.slice(0, -5) }
                return value
            default:
                return value
        }
    }
}


class NavigatorRenderer extends ComponentRenderer {
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


class FiltersRenderer extends ComponentRenderer {
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
                <input data-filter-target="index-${idx}"></input>
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
                <input data-filter-target="columns-${flatColumns.indexOf(col)}"></input>
                <button data-clear-filter>&#215;</button>
            </div>`).join('')}
        </div>`
    }
}


class TableRenderer extends ComponentRenderer {
    constructor(data) {
        super(data)
        this.navigator = new NavigatorRenderer(data)
        this.filters = new FiltersRenderer(data)
        this.thead = new TheadRenderer(data)
        this.tbody = new TbodyRenderer(data)
    }

    render() {
        return `<div class="moedertabel__explorer__records">
            ${this.navigator.render()}
            ${this.filters.render()}
            <div class="moedertabel__explorer__table">
            <table>
                ${this.thead.render()}
                ${this.tbody.render()}
            </table>
            </div>
        </div>`
    }
}


class TheadRenderer extends ComponentRenderer {
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


class TbodyRenderer extends ComponentRenderer {
    render(start=0, nrows=25) {
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
                ${TbodyRenderer.format(val, dtype)}
            </td>` }
        let getPanel = i => {
            return `<th
                data-hide-target="${spans[i]}"
                rowspan="${this.nrows}"
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


class DetailsRenderer extends ComponentRenderer {
    getElement(n) {
        let el = document.createElement("div")
        el.innerHTML = this.render(n)
        return el.firstElementChild
    }

    render(n) {
        n = this.getRowNumber(parseInt(n))
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
            ${DetailsRenderer.format(data[col], dtypes[col])}
        </div>`
    }
}

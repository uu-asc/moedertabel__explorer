import {MoederData} from "./data.js"
import {Table, Info, Tbody, Details} from "./components.js"


export class MoedertabelExplorerBuilder {
    constructor(explorer, data, start=0, nrows=25) {
        this.explorer = explorer
        this.data = data
        this.start = start
        this.nrows = nrows
        this.table = new Table(data)
        this.details = new Details(data)
        this.hiddenLabels = ["moedertabel__explorer__filters"]
    }

    get end() {
        let end = this.start + this.nrows
        return end <= this.data.lengthFiltered ? end : this.data.lengthFiltered
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
        let table = this.table.getElement(this.start, this.nrows)
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
        this.explorer.querySelector(".moedertabel__explorer__records").classList.add("hide")
        let target = this.getRowNumber(event.target.dataset.recordTarget)
        let details = this.details.getElement(target)
        let element = this.explorer.querySelector(".moedertabel__explorer__details")
        !!element ? element.replaceWith(details) : this.explorer.append(details)
        this.hideLabels()
    }

    getRowNumber(n) {
        n = parseInt(n)
        if (n < 0) { return this.nrows - 1 }
        if (n >= this.nrows) { return 0 }
        return n
    }

    updateData() {
        let tbodyRenderer = new Tbody(this.data)
        let infoRenderer = new Info(this.data)
        let tbody = this.explorer.querySelector("tbody")
        let info = this.explorer.querySelector(".moedertabel__explorer__info")
        tbody.innerHTML = tbodyRenderer.render(this.start, this.nrows)
        info.replaceWith(infoRenderer.getElement(this.start, this.nrows))
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
        if (!event.target.matches("[data-navigate], [data-navigate] span")) { return }
        let target = event.target.dataset.navigate || event.target.parentElement.dataset.navigate
        switch (target) {
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
                this.start = this.data.lengthFiltered - this.nrows
                break
        }
        if (this.start < 0) {
            this.start = 0
        } else if (this.start >= this.data.lengthFiltered) {
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
                let newWidth = cell.offsetWidth
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
                let newWidth = cell.offsetWidth
                prev += newWidth
            }
            prev = 0
        }
    }
}

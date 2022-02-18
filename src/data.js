export class MoederData {
    constructor(spec) {
        this.axes = spec.axes
        this.columns = spec.columns
        this.dtypes = spec.dtypes
        this.index = spec.index
        this.data = spec.data
        this.dataview = spec.data
        this.indexview = spec.index
    }

    // DATA/VIEW PROPERTIES
    get length() { return this.data.length }

    get lengthView() { return this.dataview.length }

    get isFiltered() { this.lengthView < this.length }

    // INDEX PROPERTIES
    get index() { return MoederData.getAsArray(this._index) }

    set index(value) { this._index = value }

    get indexDTypes() {
        let dtypes = this.dtypes.index
        return Array.isArray(dtypes) ? dtypes : [dtypes]
    }

    get indexNames() {
        let names = this.axes.index
        return Array.isArray(names) ? names : [names]
    }

    // COLUMN PROPERTIES
    get columns() { return MoederData.getAsArray(this._columns) }

    set columns(value) { this._columns = value }

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

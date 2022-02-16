export class ComponentRenderer {
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

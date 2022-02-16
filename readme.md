# MOEDERTABEL__EXPLORER

Work in progress. Table built in vanilla `javascript` with sticky column and index headers for displaying, sorting and filtering data. Individual datapoints can be copied to clipboard by clicking on them. Complete columns can be copied to the clipboard as well from the header. Records can be viewed in 'Details' mode which will display all fields of a record on a card.

See an online example with randomized data here:

[moedertabel__explorer](https://uu-asc.github.io/moedertabel__explorer/)

## How to use
Create a `MoederData` instance by giving it the data `spec`. Target the `div` where you want to display the table. Create a `MoedertabelExplorerBuilder` instance and use the `build()` method on it to add the table to the document:

```js
    let data = new MoederData(spec)
    let div = document.querySelector("#target")
    let explorer = new MoedertabelExplorerBuilder(div, data)
    explorer.build()
```

## Spec
The spec currently assumes that there are two levels to the columns of the table. Index can be one or more levels. A Pandas `DataFrame` can be converted to a spec using `to_json(orient='split')` and adding the following additional information:

- `axis`
    - `index` : [`name of index level 1`, `name of index level 2`, etc...]
    - `columns` : [`name of column level 1`, `name of column level 2`]
- `dtypes`
    - `index` : [`dtype of index level 1`, `dtype of index level 2`, etc...]
    - `columns` : [`dtype of column 1`, `dtype of column 2`, etc...]

The table currently recognizes the following dtypes:

- cat: categorical data
- str: string data
- int: integer data
- float: floating point data
- bool: boolean data
- date: datetime data

The `Moedertabel` has a `get_spec` method that will convert itself to a `spec`:

```python
    def get_spec(self):
        add_labels = self.add_labels
        self.add_labels = True
        data = self.data # <-- this creates a copy
        self.add_labels = add_labels

        for col in data.select_dtypes('datetime').columns:
            data[col] = data[col].dt.tz_localize('Europe/Amsterdam')
        dump = data.to_json(orient='split')

        def get_dtypes(index):
            return [index.get_level_values(n).dtype for n in index.names]

        def map_dtype(dtype):
            dtype = str(dtype)
            if dtype.startswith('cat'):
                return 'cat'
            if dtype.startswith('date'):
                return 'date'
            if dtype.startswith('bool'):
                return 'bool'
            if dtype.startswith('int'):
                return 'int'
            if dtype.startswith('float'):
                return 'float'
            return 'str'

        return {
            **{
                "axes": {
                    "columns": ["labels", "velden"],
                    "index": data.index.names},
                "dtypes": {
                    "index": [map_dtype(i) for i in get_dtypes(data.index)],
                    "columns": [map_dtype(i) for i in data.dtypes.values],
                }
            },
            **json.loads(dump),
        }
```

The conversion to and from `json` is done here because then Pandas takes care of converting the different dtypes into their appropriate `json` representation. This returns a dictionary which can then be converted to a `json` string.

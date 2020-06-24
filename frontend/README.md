This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Quickstart

`yarn start`

## Development Notes

On load, this single page application will randomly choose whether to load a tweet from a human tweets dataset, or from the respective language model trained on that dataset. The datasets are hardcoded in `public/data` and partitioned into files of equal length. Whenever a human tweet is loaded from a dataset, a random shard index is chosen, and a random tweet is loaded from that shard. This scheme prevents the browser from loading an entire dataset into memory at once.

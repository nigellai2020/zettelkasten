importScripts('https://cdn.jsdelivr.net/npm/minisearch@6.2.0/dist/umd/index.min.js');

let miniSearch = null;

self.onmessage = function (event) {
  const { type, notes, query, searchMode } = event.data;

  if (type === 'build') {
    miniSearch = new self.MiniSearch({
      fields: ['title', 'content', 'tags'],
      storeFields: ['id', 'title', 'content', 'tags', 'createdAt', 'updatedAt', 'links'],
    });
    miniSearch.addAll(notes);
    self.postMessage({ type: 'ready' });
  }

  if (type === 'search' && miniSearch) {
    let results = miniSearch.search(query, {
      fields: searchMode === 'all' ? ['title', 'content', 'tags'] : [searchMode],
      prefix: true,
      fuzzy: 0.2
    });
    self.postMessage({ type: 'results', results });
  }
};

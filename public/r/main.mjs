export class ChromiumWorkloads {
  constructor() {
    this._workloadsNode = this.$("#workloads")
    this._tagsNode = this.$("#tags");
    this._searchNode = this.$("#search");
    this._searchQuery = "";
    this.allTags = new Set();
    this.data = {};
    this.workloads = [];
    this.load()
  }

  get searchQuery() {
    return this._searchQuery;
  }

  set searchQuery(searchQuery) {
    this._searchQuery = searchQuery;
    this._searchNode.value = searchQuery;
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    if (searchQuery) url.searchParams.set("q", searchQuery);
    if (url.href !== window.location.href)
      window.history.pushState({}, "", url);
  }

  async load() {
    this._mayBen();
    const importMetaUrl = import.meta.url;
    const response = await fetch(`${importMetaUrl}/../../workloads.json`);
    this.data = await response.json();
    this.workloads = this.data.workloads
    const tmpTags = this.workloads.reduce(
      (tags, workload) => tags.concat(workload.tags, [workload.group]),
      []).sort()
    this.allTags = new Set(tmpTags.sort());
    this._init();
    this.updateTags();
    this.updateWorkloads();
  }

  _mayBen() {
    const url = new URL(window.location);
    if (url.host == "browserben.ch") {
      if (url.searchParams.get("ben") === "0") return;
    } else {
      if (url.searchParams.get("ben") !== "1") return;
    }
    const importMetaUrl = import.meta.url;
    this.$("body").className = "ben";
    this.$("#title").innerHTML =
      `Browser Ben 🇨🇭 recommends:
        <img src="${importMetaUrl}/../ben.gif" />`;
    url.searchParams.set("ben", "1")
    window.history.pushState({}, "", url);
  }

  _init() {
    this._searchNode.oninput = this.searchOnChange.bind(this);
    this._searchNode.onchange = this.searchOnChange.bind(this);
    this._searchNode.onkeyup = this.searchOnKeyUp.bind(this);
    this._tagsNode.onclick = this.tagsOnClick.bind(this);
    this.$("#workloads-section").className = "loaded";
    this.searchQuery = this._loadSearchQueryParams();
    globalThis.addEventListener("popstate", this.windowOnPopstate.bind(this));
    globalThis.addEventListener("click", this.windowOnClick.bind(this));
    // Don't break local vscode previews.
    if (new URL(window.location).port != 3000) search.focus();
  }

  _loadSearchQueryParams() {
    const url = new URL(window.location);
    if (url.searchParams.has("q")) return url.searchParams.get("q");
    // Try to look up the group tag from the request path.
    const parts = url.pathname.split("/");
    while (parts.length) {
      const lastPart = parts.pop();
      if (!lastPart) continue;
      if (this.allTags.has(lastPart)) return lastPart;
      break;
    }
    return "";
  }

  $(selector) {
    return document.querySelector(selector);
  }

  updateTags() {
    const items = Array.from(this.allTags).map(each => this._createTagUI(each));
    this._tagsNode.innerHTML = items.join("\n");
  }

  _createTagUI(tag) {
    return `<span class='tag'>${tag}</span>`
  }

  updateWorkloads() {
    const workloads = this._filteredWorkloads();
    if (!workloads.length) {
      this._workloadsNode.innerHTML = "<li class=empty-results >No Matches</li>";
      return;
    }
    this._workloadsNode.innerHTML = "";
    const fragment = document.createDocumentFragment();
    workloads.map(each => fragment.appendChild(this._createWorkloadNode(each)));
    this._workloadsNode.appendChild(fragment);
  }

  _filteredWorkloads() {
    const searchTerms = this.searchQuery.split(" ");
    const results = [];
    for (const workload of this.workloads) {
      if (searchTerms.every(term => this._shouldDisplayWorkload(workload, term)))
        results.push(workload)
    }
    for (const tagNode of this._tagsNode.children) {
      tagNode.classList.toggle("selected", searchTerms.includes(tagNode.innerText));
    }
    return results;
  }

  _shouldDisplayWorkload(workload, searchTerm) {
    if (workload.title.includes(searchTerm)) return true;
    if (workload.group.includes(searchTerm)) return true;
    if (workload.version == searchTerm) return true;
    if (workload.tags.includes(searchTerm)) return true;
    return false
  }

  _createWorkloadNode(workload) {
    const hostingUrl = this._workloadUrl(workload)
    const node = document.createElement("li");
    node.className = "workload";
    let innerHTML = `<a class="chromium-link" href="${hostingUrl}">${workload.title}</a>`;
    if (workload.source) {
      innerHTML += `<a class="source-link" href="${workload.source}">src</a>`;
    }
    if (workload.url) {
      innerHTML += `<a class="official-link" href="${workload.url}">official</a>`;
    }
    node.innerHTML = innerHTML;
    const details = document.createElement("details");
    let attributes = [];
    for (const [key, value] of Object.entries(workload)) {
      if (key == "title") continue;
      attributes.push(`<dt>${key}</dt><dd>${value}</dd>`)
    }
    details.innerHTML = `<summary>info</summary><dl>${attributes.join("")}</dl>`;
    node.appendChild(details);
    return node;
  }

  searchOnChange() {
    this.searchQuery = this._searchNode.value
    this.updateWorkloads()
  }

  searchOnKeyUp(event) {
    if (event.key !== "Enter") return;
    const workloads = this._filteredWorkloads();
    if (workloads.length == 1)
      window.location.href = this._workloadUrl(workloads[0])
  }

  _workloadUrl(workload) {
    const params = workload.params ? `?${workload.params}` : "";
    return `${import.meta.url}/../../${workload.group}/v${workload.version}${params}`
  }

  tagsOnClick(event) {
    const tagNode = event.target;
    const maybeTag = tagNode.innerText;
    if (!this.allTags.has(maybeTag)) return;
    const selectMultipleTags = event.metaKey || event.shiftKey;
    if (tagNode.classList.contains("selected")) {
      this.searchQuery = this._unselectTag(selectMultipleTags, maybeTag);
    } else {
      this.searchQuery = this._selectTag(selectMultipleTags, maybeTag);
    }
    this.updateWorkloads();
  }

  _selectTag(selectMultipleTags, tag) {
    if (selectMultipleTags) {
      return `${this.searchQuery} ${tag}`.trim();
    }
    return tag;
  }

  _unselectTag(selectMultipleTags, tag) {
    if (selectMultipleTags) {
      const pattern = new RegExp(` *${tag} *`);
      return this.searchQuery.replace(pattern, " ");
    }
    return tag;
  }

  windowOnPopstate(event) {
    this.searchQuery = this._loadSearchQueryParams();
    this.updateWorkloads();
  }

  windowOnClick() {
    document.querySelectorAll("details[open").forEach(
      detail => detail.open = false)
  }
}

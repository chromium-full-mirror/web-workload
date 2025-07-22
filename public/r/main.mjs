// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class ChromiumWorkloads {
  constructor() {
    this._workloadsNode = this.$("#workloads")
    this._tagsNode = this.$("#tags");
    this._searchNode = this.$("#search");
    this._searchQuery = "";
    this._nofBens = 0;
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
    this.workloads = this.data.workloads;
    let tmpTags = [];
    this.workloads.forEach(workload => {
      workload.chromiumUrl = this._workloadUrl(workload);
      tmpTags = tmpTags.concat(workload.tags, [workload.group]);
    })
    this.allTags = new Set(tmpTags.sort());
    this._init();
    this.updateTags();
    this.updateWorkloads();
  }

  _workloadUrl(workload) {
    const params = workload?.params ?? "";
    const url = new URL(import.meta.url);
    const rootPath = url.pathname.split("/").slice(0, -2).join("/");
    const branchPath = workload?.branch ?? `v${workload.version}`;
    const extraPath = workload?.path ? `${workload.path}/` : "";
    url.pathname = `${rootPath}/${workload.group}/${branchPath}/${extraPath}`;
    url.search = new URLSearchParams(params).toString();
    return url.toString();
  }

  _mayBen() {
    const url = new URL(window.location);
    this._nofBens = Math.abs(parseInt(url.searchParams.get("ben"))) || 0;
    if (url.host === "browserben.ch") {
      if (this._nofBens == 0) this._nofBens = 1;
    } else {
      if (this._nofBens == 0) return;
    }
    this.$("body").className = "ben";
    this.$("#title").innerHTML = "Browser Ben 🇨🇭 recommends:";
    this._addBens();
    url.searchParams.set("ben", this._nofBens);
    window.history.pushState({}, "", url);
  }

  async _addBens() {
    this._addBen(0);
    for (let i = 1; i < this._nofBens; i++) {
      await delay(500);
      this._addBen(i);
    }
  }

  _addBen(index) {
    const img = document.createElement("img");
    img.src = `${import.meta.url}/../ben.gif`;
    this.$("#title").appendChild(img);
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
    if (workload.version === searchTerm) return true;
    if (workload.tags.includes(searchTerm)) return true;
    return false
  }

  _createWorkloadNode(workload) {
    const hostingUrl = this._workloadUrl(workload)
    const node = document.createElement("li");
    node.className = "workload";
    node.innerHTML = `<a class="chromium-link" href="${hostingUrl}">${workload.title}</a>`;
    const details = document.createElement("details");
    let attributes = [];
    for (let [key, value] of Object.entries(workload)) {
      if (key === "title") continue;
      key = key.charAt(0).toUpperCase() + key.substring(1);
      if (typeof value === "string" && value.startsWith("http")) {
        value = `<a href='${value}'>${value}</a>`;
      } else if (Array.isArray(value)) {
        value = value.join(", ")
      }
      attributes.push(`<dt>${key}</dt><dd>${value}</dd>`)
    }
    details.innerHTML = `<summary>info</summary>
        <div>
        <dl>${attributes.join("")}</dl>
        </div>`;
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
    if (workloads.length === 1)
      window.location.href = workloads[0].chromiumUrl;
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

  windowOnClick(event) {
    // Ignore clicking on details
    let target = event.target;
    do {
      if (target.nodeName === "DETAILS") return;
      target = target.parentNode;
    } while (target)
    document.querySelectorAll("details[open").forEach(
      detail => detail.open = false)
  }
}

# Chromium Workloads

This is the source for the [chromium workloads page](https://chromium-workloads.web.app/).
We keep copies and versions of common press benchmarks and other statically
hosted workloads here.

Workloads might have custom licenses that can be found in their respective
folders.

It consist of 3 parts:
- The [workloads.json](./public/workloads.json) description file with all
   workloads.
- Workloads (e.g. existing press benchmarks) in the [public](./public) folder.
- The html / javascript code to display the data from workloads.json.

## Workloads

If possible workloads are [DEPS](./DEPS)-rolled from single-version branches.
on forked repositories on <https://chromium.googlesource.com>.

LICENSEs are part of the respective workloads or workload versions.

### Sources
 - Speedometer is pulled DEPS-rolled from a
   [chromium git mirror](https://chromium.googlesource.com/external/github.com/WebKit/Speedometer/).
 - Motionmark versions are manually copied from the
   [github repository](https://github.com/WebKit/Motionmark/).
 - JetStream versions are manually coped from the
   [webkit repository](https://github.com/WebKit/WebKit/tree/main/PerformanceTests/).


## Deployment

[chromium-workloads](https://chromium-workloads.web.app) is hosted using
[firebase](https://firebase.google.com/).
- Use [`stage-main.sh`](./stage-main.sh) to stage a testing version for the
  main page on temporary domain
- Use [`deploy-main.sh`](./deploy-main.sh) for the main page on
  <https://chromium-workloads.web.app/>,
- Use [`deploy-subdomains.sh`](./deploy-subdomains.sh) for the
  `chromium-workloads-${INDEX}.web.app>` subdomains.
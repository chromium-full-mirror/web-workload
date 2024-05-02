# Chromium Web Workloads

This is the source for the [chromium workloads page](https://chromium-workloads.web.app/).
We keep copies and versions of common press benchmarks and other statically hosted workloads here.

Workloads might have custom licenses that can be found in their respective folders.

## Deployment
The page is hosted on [firebase](https://firebase.google.com/).


- Use [`stage-main.sh`](./stage-main.sh) to stage a testing version for the main page on temporary domain
- Use [`deploy-main.sh`](./deploy-main.sh) for the main page on <https://chromium-workloads.web.app/>,
- Use [`deploy-subdomains.sh`](./deploy-subdomains.sh) for the `chromium-workloads-${INDEX}.web.app>` subdomains.


## Sources
 - Speedometer is pulled DEPS-rolled from a [chromium git mirror](https://chromium.googlesource.com/external/github.com/WebKit/Speedometer/)
 - Motionmark versions are manually copied from the [github repository](https://github.com/WebKit/Motionmark/)
 - JetStream versions are manually coped from the [webkit repository](https://github.com/WebKit/WebKit/tree/main/PerformanceTests/)
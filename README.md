# Kubernetes rollback action

An action to handle kubectl interaction for kube rollbacks

This will be used to provide functionality like:
- list available rollbacks
- Roll back a deployment

## Requirements

- Requires `kubectl` to be installed and available on the `PATH`.
- Requires https://github.com/smartlyio/kubernetes-auth-action to have been run first

## Inputs

| Name | Default | Required | Description |
|------|---------|----------|-------------|
| kubernetesContext | | yes | Kubernetes context name. Usually the name of the cluster, but can be random. |
| serviceName | | yes | Name of the kubernetes service to operate on. |
| deploymentName | | no | Name of the deployment within service to operate rollbacks on |
| command | | yes | Canary support command to run. One of `[listRecentDeploys|rollback]`. |

## Outputs

| Name | Description |
|------|-------------|
| SLACK_NOTIFICATION_MESSAGE | Message that should be sent to slack as a response to the command |

## Example usage

```yaml
name: Is Locked
on:
  pull_request:
    branches:
      - master
  push:
    branches:
      - master

jobs:
  is_locked:
    runs-on: ubuntu-latest
    id: is_locked
    steps:
      - uses: actions/checkout@v2
      - name: Authenticate with the cluster
        env:
          KUBERNETES_AUTH_TOKEN: ${{ secrets.KUBERNETES_AUTH_TOKEN }}
        uses: smartlyio/kubernetes-auth-action@v1
        with:
          kubernetesClusterDomain: my-kubernetes-server.example.com
          kubernetesContext: test-context
          kubernetesNamespace: test-service
      - name: Check if deployment is locked
        uses: smartlyio/kubernetes-rollback-action@v1
        with: 
          kubernetesContext: test-context
          serviceName: test-service
          deploymentName: web
          command: listRecentDeploys
```

## Development

Install the dependencies  
```bash
$ npm install
```

Build the typescript and package it for distribution
```bash
$ npm run build && npm run package
```

Run the tests :heavy_check_mark:  
```bash
$ npm test

 PASS  ./index.test.js
  ✓ ...

...
```

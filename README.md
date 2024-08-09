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
| rollbackSha | | no | Git revision to validate with the `checkRevision` command. |

## Outputs

| Name | Description |
|------|-------------|
| SLACK_NOTIFICATION_MESSAGE | Message that should be sent to slack as a response to the command |
| ALLOW_ROLLBACK | Whether or not rollback should be allowed. `true/false` |

## Example usage

```yaml
name: Is Locked

<manual-trigger>

jobs:
  list_deploys:
    runs-on: ubuntu-22.04
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
      - name: List recent deploys for rollback
        uses: smartlyio/kubernetes-rollback-action@v1
        with: 
          kubernetesContext: test-context
          serviceName: test-service
          deploymentName: web
          command: listRecentDeploys

  rollback:
    runs-on: ubuntu-22.04
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
      - name: Check if deploy is allowed
        uses: smartlyio/kubernetes-rollback-action@v1
        id: check_revision
        with: 
          kubernetesContext: test-context
          serviceName: test-service
          deploymentName: web
          rollbackSha: abc123
          command: checkRevision
      - name: notify deploy started/failed
        uses: smartlyio/workflow-webhook@v1
        with:
          webhook_url: "${{ secrets.SLACK_NOTIFY_URL }}"
          webhook_auth: "${{ secrets.SLACK_NOTIFY_TOKEN }}"
          webhook_secret: "${{ secrets.SLACK_NOTIFY_HMAC_SECRET }}"
          data: |
            {
              "channels": ["${{ github.event.inputs.channel }}"],
              "jobs": {},
              "user": "${{ github.event.inputs.user }}",
              "run_id": ${{ github.run_id }},
              "thread_id": "${{ github.event.inputs.threadId }}",
              "notification_override": {
                "text": "${{ steps.check_revision.outputs.SLACK_NOTIFICATION_MESSAGE }}"
              }
            } 
      - name: checkout revision
        if: steps.check_revision.outputs.ALLOW_ROLLBACK == 'true'
        uses: actions/checkout@v2
        with:
          ref: ${{ fixme.rollbackSha }}
            
      - name: Deploy with krane
        if: steps.check_revision.outputs.ALLOW_ROLLBACK == 'true'

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

import * as core from '@actions/core'
import {runKubectl, stringToArray} from './kubectl'

export interface DeploymentInfo {
  id: number
  type: string
  deployer: string
  revision: string
  at: string
}

export function formatDeploysList(
  serviceName: string,
  deploymentName: string,
  deployments: DeploymentInfo[]
): string {
  let message = `*Most recent ${serviceName} deploys:*\n\n`

  let previousDeployment: DeploymentInfo | undefined
  for (const deployment of deployments) {
    if (previousDeployment) {
      const githubUrl = `https://github.com/smartlyio/${serviceName}/compare/${deployment.revision}..${previousDeployment.revision}`
      const deploymentDetail = `\
${deployment.at} \
${deployment.revision} \
<${githubUrl}|GitHub>  \
${deployment.deployer}
`
      message += deploymentDetail
    }
    previousDeployment = deployment
  }

  message += `\nExecute rollback with \`hubot kube-gha-rollback ${serviceName} <revision>\``

  return message
}

async function getRecentDeploys(
  kubernetesContext: string,
  serviceName: string,
  deploymentName: string
): Promise<DeploymentInfo[]> {
  const deploymentsRaw = await runKubectl(kubernetesContext, [
    'rollout',
    'history',
    'deployments',
    deploymentName
  ])
  const historyItemRegexp = /^([0-9]+)\s+(.*)$/
  const deployments: DeploymentInfo[] = stringToArray(deploymentsRaw)
    .filter(item => {
      return historyItemRegexp.test(item)
    })
    .map((line: string) => {
      const match = line.trim().match(historyItemRegexp)
      if (match) {
        const [, revision, annotation] = match
        const parts = annotation.split(',')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const deploymentInfo: Record<string, any> = {
          id: parseInt(revision)
        }
        for (const part of parts) {
          const [key, value] = part.split('=')
          deploymentInfo[key] = value
        }
        return deploymentInfo as DeploymentInfo
      } else {
        throw new Error(
          `Line "${line}" didn't match regex "${historyItemRegexp}". This is not expeted!`
        )
      }
    })
    .reverse()

  core.info(`Found ${deployments.length} previous deployments`)
  return deployments
}

export async function listRecentDeploys(
  kubernetesContext: string,
  serviceName: string,
  deploymentName: string
): Promise<void> {
  const deployments = await getRecentDeploys(
    kubernetesContext,
    serviceName,
    deploymentName
  )
  const deploymentListMessage = formatDeploysList(
    serviceName,
    deploymentName,
    deployments
  )

  core.info(deploymentListMessage)
  core.setOutput('SLACK_NOTIFICATION_MESSAGE', deploymentListMessage)
}

export async function rollbackCheckRevision(
  kubernetesContext: string,
  serviceName: string,
  deploymentName: string,
  rollbackSha: string
): Promise<void> {
  const deployments = await getRecentDeploys(
    kubernetesContext,
    serviceName,
    deploymentName
  )
  const requestedDeployments = deployments.filter(item => {
    return item.revision === rollbackSha
  })
  let message
  let allowRollback = false
  if (requestedDeployments.length === 0) {
    message = `\
Could not find recent deploy of \`${serviceName}\` with revision \`${rollbackSha}\`
Use \`hubot kube-gha-rollback ${serviceName} list\` to get the list of available rollback revisions.
`
  } else {
    message = `Starting rollback of \`${serviceName}\` to revision \`${rollbackSha}\``
    allowRollback = true
  }

  core.setOutput('SLACK_NOTIFICATION_MESSAGE', message)
  core.setOutput('ALLOW_ROLLBACK', allowRollback.toString())
}

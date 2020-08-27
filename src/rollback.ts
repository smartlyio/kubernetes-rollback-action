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
  let message = `**Most recent ${serviceName} deploys:**\n\n`

  let previousDeployment: DeploymentInfo | undefined
  for (const deployment of deployments) {
    if (previousDeployment) {
      const githubUrl = `https://github.com/smartlyio/${serviceName}/compare/${deployment.revision}..${previousDeployment.revision}`
      const deploymentDetail = `\
${deployment.at} \
${deployment.revision} \
[GitHub](${githubUrl})  \
${deployment.deployer}
`
      message += deploymentDetail
    }
    previousDeployment = deployment
  }

  message += `\nExecute rollback with \`hubot kube-gha-rollback ${serviceName} <revision>\``

  return message
}

export async function listRecentDeploys(
  kubernetesContext: string,
  serviceName: string,
  deploymentName: string
): Promise<void> {
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

  const deploymentListMessage = formatDeploysList(
    serviceName,
    deploymentName,
    deployments
  )

  core.info(deploymentListMessage)
  core.setOutput('SLACK_NOTIFICATION_MESSAGE', deploymentListMessage)
}

import * as core from '@actions/core'
import {listRecentDeploys, rollbackCheckRevision} from './rollback'

async function run(): Promise<void> {
  try {
    const kubernetesContext = core.getInput('kubernetesContext', {
      required: true
    })
    const serviceName = core.getInput('serviceName', {required: true})
    const deploymentName = core.getInput('deploymentName', {required: true})
    const command = core.getInput('command', {required: true})
    if (command === 'listRecentDeploys') {
      await listRecentDeploys(kubernetesContext, serviceName, deploymentName)
    } else if (command === 'checkRevision') {
      const rollbackSha = core.getInput('rollbackSha')
      if (!rollbackSha) {
        throw new Error('Required input `rollbackSha` was not provided.')
      }
      await rollbackCheckRevision(
        kubernetesContext,
        serviceName,
        deploymentName,
        rollbackSha
      )
    } else {
      throw new Error(`Command "${command}" is not implemented`)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()

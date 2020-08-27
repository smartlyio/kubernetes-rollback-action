import * as core from '@actions/core'
import {listRecentDeploys} from './rollback'

async function run(): Promise<void> {
  try {
    const kubernetesContext = core.getInput('kubernetesContext', {
      required: true
    })
    const serviceName = core.getInput('serviceName', {required: true})
    const deploymentName = core.getInput('deploymentName')
    const command = core.getInput('command', {required: true})
    if (command === 'listRecentDeploys') {
      await listRecentDeploys(kubernetesContext, serviceName, deploymentName)
    } else {
      throw new Error(`Command "${command}" is not implemented`)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()

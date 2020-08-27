import {setOutput, info} from '@actions/core'
import {mocked} from 'ts-jest/utils'
import {runKubectl} from '../src/kubectl'
import {
  listRecentDeploys,
  formatDeploysList,
  DeploymentInfo
} from '../src/rollback'

jest.mock('@actions/core')
jest.mock('../src/kubectl', () => {
  // Require the original module to not be mocked...
  const originalModule = jest.requireActual('../src/kubectl')

  return {
    ...originalModule,
    runKubectl: jest.fn()
  }
})

const OLD_ENV = process.env
beforeEach(() => {
  process.env = {...OLD_ENV}
  mocked(runKubectl).mockClear()
})

afterEach(() => {
  process.env = OLD_ENV
})

describe('formatDeploysList', () => {
  test('formats results for slack', () => {
    const makeDeployment = (id: number): DeploymentInfo => {
      return {
        id: id,
        type: 'kubernetes-deploy',
        deployer: `user-${id}`,
        revision: `rev-${id}`,
        at: `time-${id}`
      }
    }
    const deployments: DeploymentInfo[] = []
    for (let id = 7; id > 0; id--) {
      deployments.push(makeDeployment(id))
    }
    // We have the deployments we want in the right order...
    expect(deployments.map(i => i.id)).toEqual([7, 6, 5, 4, 3, 2, 1])

    const service = 'distillery'
    const deploymentName = 'web'
    const message = formatDeploysList(service, deploymentName, deployments)

    const message_lines = message.split('\n')

    expect(message_lines[0]).toMatch(/Most recent distillery deploys/)
    expect(message_lines[1]).toEqual('')
    expect(message_lines[message_lines.length - 1]).toMatch(
      /Execute rollback with/
    )
    expect(message_lines[message_lines.length - 2]).toEqual('')

    const revisions = message_lines.slice(2, -2)
    expect(revisions.length).toEqual(6)

    for (let id = revisions.length; id > 0; id--) {
      const index = revisions.length - id
      const regexp = new RegExp(
        `^time-${id} rev-${id} .GitHub..https.*distillery.* user-${id}$`
      )
      expect(revisions[index]).toMatch(regexp)
    }
  })
})

describe('listRecentDeploys', () => {
  test('list recent deploys', async () => {
    const rolloutHistory = `deployment.extensions/web
REVISION  CHANGE-CAUSE
118       type=kubernetes-deploy,deployer=user-1,revision=01234,at=2020-08-20 14:39:59 UTC
119       type=kubernetes-deploy,deployer=user-1,revision=12345,at=2020-08-20 14:45:03 UTC
120       type=kubernetes-deploy,deployer=user-2,revision=23456,at=2020-08-20 15:41:27 UTC
121       type=kubernetes-deploy,deployer=user-1,revision=34567,at=2020-08-21 10:27:55 UTC
`

    const expectedLines = [
      '2020-08-20 15:41:27 UTC 23456 [GitHub](https://github.com/smartlyio/service/compare/23456..34567)  user-2',
      '2020-08-20 14:45:03 UTC 12345 [GitHub](https://github.com/smartlyio/service/compare/12345..23456)  user-1',
      '2020-08-20 14:39:59 UTC 01234 [GitHub](https://github.com/smartlyio/service/compare/01234..12345)  user-1'
    ]

    const runKubectlMock = mocked(runKubectl)
    runKubectlMock.mockImplementationOnce(async () => rolloutHistory)

    await listRecentDeploys('kube-prod', 'service', 'web')

    const infoMock = mocked(info)

    // Put some information in the build output
    expect(infoMock.mock.calls.length).toEqual(2)

    const setOutputMock = mocked(setOutput)
    expect(setOutputMock.mock.calls.length).toEqual(1)
    const [name, value] = setOutputMock.mock.calls[0]
    expect(name).toEqual('SLACK_NOTIFICATION_MESSAGE')
    const lines = value.trim().split('\n')

    expect(lines.length).toEqual(expectedLines.length + 4) // two blanks and two context lines
    const detailLines = lines.slice(2, -2)
    expect(detailLines).toEqual(expectedLines)
  })
})

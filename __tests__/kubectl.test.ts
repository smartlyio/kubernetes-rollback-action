import {exec} from '@actions/exec'
import {mocked} from 'jest-mock'
import {runKubectl, stringToArray, uniq} from '../src/kubectl'

jest.mock('@actions/exec', () => ({
  exec: jest.fn()
}))

const OLD_ENV = process.env
beforeEach(() => {
  process.env = {...OLD_ENV}
})

afterEach(() => {
  process.env = OLD_ENV
})

describe('stringToArray', () => {
  test('should return an empty array for an empty string', () => {
    expect(stringToArray('')).toEqual([])
  })

  test('should trim whitespace', () => {
    expect(stringToArray('  item\nitem2  ')).toEqual(['item', 'item2'])
  })

  test('should leave inter-item whitespace alone', () => {
    expect(stringToArray('  item\n  item2  ')).toEqual(['item', '  item2'])
  })
})

describe('uniq', () => {
  test('Should return only unique items in an array', () => {
    const input = ['item1', 'item2', 'item1', 'item3']
    expect(uniq(input)).toEqual(['item1', 'item2', 'item3'])
  })
})

describe('runKubectl', () => {
  test('should run kubectl with context and capture output', async () => {
    const output = 'some-result\n'
    const mockExec = mocked(exec)
    mockExec.mockImplementation(async (command, args, options) => {
      if (options && options.listeners && options.listeners.stdout) {
        options.listeners.stdout(Buffer.from(output))
      }
      return 0
    })
    const result = await runKubectl('context', ['some', 'command'])

    expect(result).toEqual(output.trim())

    expect(mockExec.mock.calls.length).toBe(1)
    const expectedOptions = expect.objectContaining({
      listeners: expect.objectContaining({
        stdout: expect.anything()
      })
    })
    expect(mockExec).toHaveBeenCalledWith(
      'kubectl',
      ['--context', 'context', 'some', 'command'],
      expectedOptions
    )
  })
})

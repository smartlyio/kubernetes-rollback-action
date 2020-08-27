import * as exec from '@actions/exec'

export async function runKubectl(
  context: string,
  command: string[]
): Promise<string> {
  let stdout = ''
  const options: exec.ExecOptions = {
    listeners: {
      stdout: (data: Buffer) => {
        stdout += data.toString()
      }
    }
  }

  const args = ['--context', context]
  for (const arg of command) {
    args.push(arg)
  }
  await exec.exec('kubectl', args, options)
  return stdout.trim()
}

export function stringToArray(value: string, sep?: string): string[] {
  const separator = sep ? sep : '\n'
  const trimmed = value.trim()
  if (!trimmed) {
    return []
  }
  return value.trim().split(separator)
}

export function uniq(items: string[]): string[] {
  return items.filter((value, index, self) => {
    return self.indexOf(value) === index
  })
}

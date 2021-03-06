import { argv, stdout, exit } from 'node:process'

import { spinner } from 'zx/experimental'
import { rm } from 'fs-extra'
import minimist from 'minimist'
import { red, green, cyan } from 'kolorist'
import prompts from 'prompts'

import { Git } from '@/git'
import { startCommand } from '@/commands'
import { branchDir, exists, Icons } from '@/utils'

declare type CloneArgs = {
  verbose?: boolean
}

export async function cloneCommand(config: Config): Future<void> {
  const args: CloneArgs = minimist(argv.slice(1))

  const git = new Git('https://github.com/VadimMalykhin/binance-icons.git', { verbose: args.verbose })

  if (!(await git.isInstalled())) {
    stdout.write(red(`${Icons.cross} git is not installed.\n`))
    return
  }

  const _clone = async (branchDirectory: string, branch: string, overwrite = false): Promise<void> => {
    stdout.write(`${green(Icons.mark)} Selected branch: ${cyan(branch)}\n`)

    if ((await exists(branchDirectory)) && !overwrite) {
      const answer = await prompts([
        {
          type: 'confirm',
          name: 'value',
          message: `Remove the previously cloned '${cyan(branch)}' branch directory?`
        },
        {
          onCancel() {
            throw new Error(`${red(Icons.cross)} Operation cancelled`)
          }
        }
      ])
      if (!answer.value) {
        return
      }
      await rm(branchDirectory, { force: true, recursive: true })
      stdout.write(`${green(Icons.mark)} The '${red(branch)}' directory was successfully removed.\n`)
    }

    if (overwrite && (await exists(branchDirectory))) {
      await rm(branchDirectory, { force: true, recursive: true })
      stdout.write(`${green(Icons.mark)} The '${red(branch)}' directory was successfully removed.\n`)
    }

    await spinner(`Cloning '${branch}' branch... `, async () => {
      const result = await git.clone(branchDirectory, branch, { depth: '1' })
      if (result) {
        // echo`${result.code}`
      }

      stdout.write(`${green(Icons.mark)} The '${cyan(branch)}' branch was successfully cloned.\n`)
    })
  }

  try {
    const response = await prompts([
      {
        type: 'select',
        name: 'value',
        message: 'Select a Command',
        choices: [
          { title: 'Back', value: 'back' },
          { title: 'All', description: 'Clone all below', value: 'all' },
          { title: 'Main', description: "Clone 'main' branch", value: 'main' },
          { title: 'Dev', description: "Clone 'dev' branch", value: 'dev' }
        ],
        initial: 0
      }
    ])

    switch (response.value) {
      case 'back': {
        await startCommand()
        break
      }
      case 'all': {
        await _clone(branchDir('main'), 'main', true)
        await _clone(branchDir('dev'), 'dev', true)
        break
      }
      case 'main': {
        await _clone(branchDir('main'), 'main', true)
        break
      }
      case 'dev': {
        await _clone(branchDir('dev'), 'dev', true)
        break
      }
      default: {
        exit(1)
        break
      }
    }
    stdout.write('\r')
    await startCommand(config)
  } catch (err) {
    stdout.write(`${(err as Error).message}\n`)
    exit(1)
  }
}

import type { TFunction } from 'i18next'
import { PROFILE } from '../../../constants/profile'
import { EXPERIENCE } from '../../../constants/experience'
import { STACK_LAYERS } from '../../../constants/stack'
import type { Segment } from '../../../lib/typewriter'

export type TerminalCommand = 'whoami' | 'skills' | 'projects' | 'git' | 'contact'

export const TERMINAL_COMMANDS: readonly TerminalCommand[] = [
  'whoami',
  'skills',
  'projects',
  'git',
  'contact',
]

export const COMMAND_TARGETS: Partial<Record<TerminalCommand, string>> = {
  projects: 'projects',
  contact: 'contact',
}

const muted = (text: string): Segment => ({ text, className: 'is-muted' })
const key = (text: string): Segment => ({ text, className: 'is-key' })
const command = (text: string): Segment => ({ text, className: 'is-command' })

function aligned(rows: [label: Segment, value: string][], separator = '  '): Segment[] {
  const width = Math.max(...rows.map(([label]) => label.text.length))
  return rows.flatMap(([label, value], i) => [
    { ...label, text: label.text },
    {
      text:
        ' '.repeat(width - label.text.length) +
        separator +
        value +
        (i < rows.length - 1 ? '\n' : ''),
    },
  ])
}

export function typedCommand(name: TerminalCommand, t: TFunction): string {
  return name === 'git' ? t('terminal.typed.git') : t(`terminal.commands.${name}`)
}

export function commandOutput(name: TerminalCommand, t: TFunction): Segment[] {
  switch (name) {
    case 'whoami':
      return aligned(
        [
          [muted(`${t('terminal.whoami.name')}:`), PROFILE.fullName],
          [muted(`${t('terminal.whoami.role')}:`), t('hero.role')],
          [muted(`${t('terminal.whoami.stack')}:`), PROFILE.headlineStack.join(', ')],
          [muted(`${t('terminal.whoami.location')}:`), t('terminal.whoami.locationValue')],
        ],
        ' ',
      )
    case 'skills':
      return aligned(
        STACK_LAYERS.map((layer) => [
          key(t(`terminal.skills.${layer.id}`)),
          layer.techs.join(', '),
        ]),
        '  ',
      )
    case 'projects':
      return [
        ...aligned([
          [key('sparkchat'), t('terminal.projects.sparkchat')],
          [key('petland'), t('terminal.projects.petland')],
        ]),
        { text: '\n\n' },
        muted(t('terminal.projects.opening')),
      ]
    case 'git':
      return EXPERIENCE.flatMap((commit, i) => [
        command(commit.hash),
        {
          text:
            ' ' +
            (commit.head
              ? '(HEAD → main) '
              : commit.branchLabel
                ? `(${t('experience.studiesLane')}) `
                : '') +
            t(`terminal.git.${commit.id}`) +
            (i < EXPERIENCE.length - 1 ? '\n' : ''),
        },
      ])
    case 'contact':
      return [
        muted(`${t('terminal.contact.channels')}:`),
        { text: ` ${t('terminal.contact.channelsValue')}\n` },
        muted(`${t('terminal.contact.reply')}:`),
        { text: ` ${t('terminal.contact.replyValue')}` },
        { text: '\n\n' },
        muted(t('terminal.contact.opening')),
      ]
  }
}

export function bootOutput(t: TFunction, ms: number): Segment[] {
  return [
    { text: '\n  ' },
    key('VITE'),
    { text: ' v8.2  ' },
    muted(t('terminal.boot.ready', { ms })),
    { text: '\n\n  ' },
    muted('➜'),
    { text: `  ${t('terminal.boot.board')}: ` },
    command(t('terminal.boot.boardValue')),
    { text: '\n  ' },
    muted('➜'),
    { text: `  ${t('terminal.boot.name')}:  ` },
    command(t('terminal.boot.nameValue')),
  ]
}

import minimatch from 'minimatch'
import * as core from '@actions/core'

export enum Result {
  ok,
  warning,
  error
}

interface CheckerParams {
  errorSize: number
  warningSize: number
  excludeTitle?: RegExp
  excludeLabel?: string
  excludePaths?: string[]
}

export class Checker {
  private readonly errorSize: number
  private readonly warningSize: number
  private readonly excludeTitle: RegExp | undefined
  private readonly excludeLabel: string | undefined
  private readonly excludePaths: string[]

  constructor(params: CheckerParams) {
    this.errorSize = params.errorSize
    this.warningSize = params.warningSize
    this.excludeTitle = params.excludeTitle
    this.excludeLabel = params.excludeLabel
    this.excludePaths = params.excludePaths ?? []
  }

  check(pr: {
    title: string
    labels: string[]
    files: {additions: number; filename: string}[]
  }): Result {
    core.debug(`PR title: ${pr.title}`)
    if (this.shouldSkip(pr.title, pr.labels)) return Result.ok

    const files = pr.files.filter(f => !this.excludePaths.some(p => minimatch(f.filename, p)))

    if (core.isDebug()) {
      core.debug(`PR files: [${pr.files.map(f => f.filename).join(', ')}]`)
      core.debug(`Filtered files: [${files.map(f => f.filename).join(', ')}]`)
    }

    const additions = Checker.getAdditions(files)
    if (additions > this.errorSize) return Result.error
    if (additions > this.warningSize) return Result.warning
    return Result.ok
  }

  private shouldSkip(title: string, labels: string[]): boolean {
    const exclude = this.excludeTitle?.test(title) ?? false
    if (exclude) {
      return true
    }
    return this.excludeLabel === undefined ? false : labels.includes(this.excludeLabel)
  }

  private static getAdditions(data: {additions: number}[]): number {
    return data.map(v => v.additions).reduce((acc, v) => acc + v, 0)
  }
}

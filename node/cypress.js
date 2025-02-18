const path = require('path')

const cypress = require('cypress')
const { merge } = require('lodash')
const jsYaml = require('js-yaml')

const storage = require(`./storage`)
const system = require('./system')
const logger = require('./logger')
const workspace = require('./workspace')

// Get Cypress Folder [cypress or cypress-shared]
exports.getCypressFolder = () => {
  return storage.exists(path.join(system.basePath(), 'cypress', 'integration'))
    ? 'cypress'
    : 'cypress-shared'
}

// Save Env for Cypress
exports.saveCypressEnvJson = (config) => {
  storage.writeJson(
    config,
    path.join(system.cyRunnerPath(), 'cypress.env.json')
  )
}

// Save config for Cypress
exports.saveCypressJson = (config) => {
  storage.writeJson(
    {
      baseUrl: config.base.vtex.baseUrl,
      chromeWebSecurity: config.base.cypress.chromeWebSecurity,
      video: config.base.cypress.video,
      videoCompression: config.base.cypress.videoCompression,
      videoUploadOnPasses: config.base.cypress.videoUploadOnPasses,
      screenshotOnRunFailure: config.base.cypress.screenshotOnRunFailure,
      trashAssetsBeforeRuns: config.base.cypress.trashAssetsBeforeRuns,
      viewportWidth: config.base.cypress.viewportWidth,
      viewportHeight: config.base.cypress.viewportHeight,
      defaultCommandTimeout: config.base.cypress.defaultCommandTimeout,
      requestTimeout: config.base.cypress.defaultCommandTimeout,
      watchForFileChanges: config.base.cypress.watchForFileChanges,
      pageLoadTimeout: config.base.cypress.pageLoadTimeout,
      browser: config.base.cypress.browser,
      projectId: config.base.cypress.projectId,
      retries: 0,
      screenshotsFolder: 'logs/screenshots',
      videosFolder: 'logs/videos',
    },
    path.join(system.cyRunnerPath(), 'cypress.json')
  )
}

// Deal with stop on fail
exports.stopOnFail = async (config, step, runUrl) => {
  logger.msgSection(`Stop on fail triggered by strategy ${step.strategy}`)

  step.specsPassed.sort()
  step.specsPassed.forEach((spec) => {
    logger.msgOk(this.specNameClean(spec))
  })

  logger.newLine()

  step.specsFailed.sort()
  step.specsFailed.forEach((spec) => {
    logger.msgError(this.specNameClean(spec))
  })

  await workspace.teardown(config)
  if (runUrl != null) this.showDashboard(runUrl)
  system.crash('Triggered stop on fail', step.strategy)
}

// Show URL for Cypress Dashboard or Sorry Cypress
exports.showDashboard = (url) => {
  logger.msgSection(`[Cypress Dashboard](${url})`, true)
  logger.msgOk(url, true)
}

// Beauty spec name to show on logs
exports.specNameClean = (spec) => {
  const clean = spec.replace('cypress/integration/', '')

  return clean.replace('cypress-shared/integration/', '')
}

// Open Cypress
exports.open = async () => {
  logger.msgSection('Running in dev mode')

  const CY_FOLDER = this.getCypressFolder()
  const options = {
    config: {
      integrationFolder: `${CY_FOLDER}/integration`,
      supportFile: `${CY_FOLDER}/support`,
      fixturesFolder: `${CY_FOLDER}/fixtures`,
      pluginsFile: `${CY_FOLDER}/plugins/index.js`,
      downloadsFolder: `${CY_FOLDER}/downloads`,
    },
  }

  logger.msgWarn('Verity if the workspace has the Apps you need already')

  try {
    await cypress.open(options)
  } catch (e) {
    system.crash('Failed to open Cypress', e.message)
  }
}

// Run Cypress
exports.run = async (test, config, addOptions = {}) => {
  // Mix Cypress base folder isn't allowed
  const SPEC_PATH = path.parse(test.specs[0]).dir
  const CY_FOLDER = this.getCypressFolder()

  test.specs.forEach((spec) => {
    if (path.parse(spec).dir !== SPEC_PATH) {
      system.crash('Paths mixed on the same strategy', spec)
    }
  })

  // Build options
  let options = {
    config: {
      integrationFolder: SPEC_PATH,
      supportFile: `${SPEC_PATH.split(path.sep)[0]}/support`,
      fixturesFolder: `${CY_FOLDER}/fixtures`,
      pluginsFile: `${CY_FOLDER}/plugins/index.js`,
      downloadsFolder: `${CY_FOLDER}/downloads`,
    },
    spec: test.specs,
    headed: config.base.cypress.runHeaded,
    browser: config.base.cypress.browser,
    quiet: config.base.cypress.quiet,
  }

  const testToRun = []
  let maxJobs = 1

  // maxJobs = 0 --> running local without Sorry Cypress
  if (config.base.cypress.maxJobs) {
    options = tuneOptions(options, config)
    merge(options, addOptions)
    maxJobs = getMaxJobs(test, config)
  }

  // Mount parallel jobs
  for (let i = 0; i < maxJobs; i++) {
    testToRun.push(
      // eslint-disable-next-line no-loop-func
      cypress.run(options).then((result) => {
        const specsPassed = []
        const specsFailed = []

        // If Cypress fails, roll back the spec
        if (result.failures) {
          logger.msgError('Got error from Cypress')
          logger.msgPad(JSON.stringify(result))

          return { success: false, specsPassed, specsFailed, runUrl: null }
        }

        // Remove sensitive data and get runUrl
        delete result.config
        const { runUrl } = result

        // Return specs passed and failed
        result.runs.forEach((run) => {
          const logName = run.spec.name.replace('.js', '-result.yaml')
          const logFile = path.join(logger.logPath(), logName)
          const logFlow = {}

          logFlow[`epoc-${system.tick()}`] = result
          storage.append(jsYaml.dump(logFlow), logFile)

          if (run.stats.failures) specsFailed.push(run.spec.relative)
          else specsPassed.push(run.spec.relative)
        })

        return { success: true, specsPassed, specsFailed, runUrl }
      })
    )
  }

  try {
    return await Promise.all(testToRun)
  } catch (e) {
    await workspace.teardown(config)
    system.crash('Failed to run Cypress', e)
  }
}

// Tune options
function tuneOptions(options, config) {
  const RUN_ID = process.env.GITHUB_RUN_ID ?? system.getId()
  const RUN_ATTEMPT = process.env.GITHUB_RUN_ATTEMPT ?? 1

  options.key = config.base.cypress.dashboardKey
  options.record = true
  options.ciBuildId = `${RUN_ID}-${RUN_ATTEMPT}`

  // Configure Cypress to use Sorry Cypress if not in CI
  if (!system.isCI()) process.env.CYPRESS_INTERNAL_ENV = 'development'

  return options
}

// Calculate max jobs
function getMaxJobs(test, config) {
  let maxJobs = 1

  if (test.parallel) {
    maxJobs =
      test.specs.length < config.base.cypress.maxJobs
        ? test.specs.length
        : config.base.cypress.maxJobs
  }

  return maxJobs
}

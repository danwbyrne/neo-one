import { cliLogger, getLogPath } from '@neo-one/logger';
import { plugins as pluginsUtil } from '@neo-one/server';
import {
  Client,
  createServerConfig,
  PluginNotInstalledError,
  ServerManager,
  UnknownPluginResourceType,
} from '@neo-one/server-client';
import {
  CLIHook,
  Config,
  DescribeTable,
  ListTable,
  name,
  paths as defaultPaths,
  Plugin,
  ResourceType,
  Session,
  VERSION,
} from '@neo-one/server-plugin';
// tslint:disable-next-line match-default-export-name
import Table from 'cli-table2';
import * as inquirer from 'inquirer';
import ora from 'ora';
import * as path from 'path';
import { BehaviorSubject, combineLatest, defer, Observable } from 'rxjs';
import { distinctUntilChanged, map, mergeScan, publishReplay, refCount, switchMap, take } from 'rxjs/operators';
import Vorpal, { Args, CommandInstance } from 'vorpal';
import { commands, createPlugin } from './interactive';
import { ClientConfig, createBinary, createClientConfig, setupCLI } from './utils';
import { reportError } from './utils/reportError';

const logger = cliLogger.child({ component: 'interactive' });

const shutdownReport = (logFile: string, shutdownCB: () => void) => {
  reportError(logFile)
    .then(shutdownCB)
    .catch(shutdownCB);
};

// tslint:disable-next-line readonly-array
const getTable = (head?: string[]) =>
  new Table({
    head,
    chars: {
      top: '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      bottom: '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      left: '',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '',
      'right-mid': '',
      middle: ' ',
    },

    style: {
      head: [],
      border: [],
      'padding-left': 0,
      'padding-right': 0,
    },
  });

interface Sessions {
  // tslint:disable-next-line readonly-keyword
  [plugin: string]: Session;
}

export class InteractiveCLI {
  public readonly vorpal: Vorpal;
  private readonly mutableSessions: Sessions;
  private readonly sessions$: BehaviorSubject<Sessions>;
  // tslint:disable-next-line readonly-keyword readonly-array
  private readonly mutablePreHooks: { [command: string]: CLIHook[] };
  // tslint:disable-next-line readonly-keyword readonly-array
  private readonly mutablePostHooks: { [command: string]: CLIHook[] };
  private mutableDelimiter: Array<{ readonly key: string; readonly name: string }>;
  // tslint:disable-next-line readonly-keyword readonly-array
  private readonly mutablePlugins: { [name: string]: Plugin };
  private mutableClient: Client | undefined;
  private mutableClientConfig: Config<ClientConfig> | undefined;
  private readonly serverConfig: {
    readonly dir?: string;
    readonly serverPort?: number;
    readonly httpServerPort?: number;
    readonly minPort?: number;
  };
  private mutableThrowError = false;

  public constructor({
    dir,
    serverPort,
    httpServerPort,
    minPort,
  }: {
    readonly dir?: string;
    readonly serverPort?: number;
    readonly httpServerPort?: number;
    readonly minPort?: number;
  }) {
    this.vorpal = new Vorpal().version(VERSION);
    this.mutableSessions = {};
    this.sessions$ = new BehaviorSubject<Session>({});
    this.mutablePreHooks = {};
    this.mutablePostHooks = {};
    this.mutableDelimiter = [];
    this.mutablePlugins = {};
    this.serverConfig = { dir, serverPort, httpServerPort, minPort };
  }

  public get throwError(): boolean {
    return this.mutableThrowError;
  }

  public get client(): Client {
    if (this.mutableClient === undefined) {
      throw new Error('Something went wrong');
    }

    return this.mutableClient;
  }

  public get clientConfig(): Config<ClientConfig> {
    if (this.mutableClientConfig === undefined) {
      throw new Error('Something went wrong');
    }

    return this.mutableClientConfig;
  }

  public async getSession(plugin: string): Promise<Session> {
    return this.mutableSessions[plugin] === undefined ? {} : this.mutableSessions[plugin];
  }

  public updateSession(plugin: string, session: Session): void {
    this.mutableSessions[plugin] = session;
    this.sessions$.next(this.mutableSessions);
  }

  public mergeSession(plugin: string, session: Session): void {
    this.mutableSessions[plugin] = {
      ...(this.mutableSessions[plugin] === undefined ? {} : this.mutableSessions[plugin]),
      ...session,
    };

    this.sessions$.next(this.mutableSessions);
  }

  public getSession$(plugin: string): Observable<Session> {
    return this.sessions$.pipe(map((sessions) => (sessions[plugin] === undefined ? {} : sessions[plugin])));
  }

  public addDelimiter(keyIn: string, nameIn: string): void {
    this.filterDelimiter(keyIn);
    this.mutableDelimiter.push({ key: keyIn, name: nameIn });
    this.setDelimiter();
  }

  public removeDelimiter(keyIn: string): void {
    this.filterDelimiter(keyIn);
    this.setDelimiter();
  }

  public resetDelimiter(): void {
    this.mutableDelimiter = [];
    this.setDelimiter();
  }

  public async start(argv: readonly string[]): Promise<void> {
    const { dir } = this.serverConfig;
    const paths = {
      data: dir === undefined ? defaultPaths.data : path.join(dir, 'data'),
      config: dir === undefined ? defaultPaths.config : path.join(dir, 'config'),
      log: dir === undefined ? defaultPaths.log : path.join(dir, 'log'),
      cache: dir === undefined ? defaultPaths.cache : path.join(dir, 'cache'),
      temp: dir === undefined ? defaultPaths.temp : path.join(dir, 'temp'),
    };

    const { mutableShutdownFuncs, shutdown: shutdownIn } = setupCLI({
      vorpal: this.vorpal,
    });

    this.mutableClientConfig = createClientConfig({ paths });

    let isShutdown = false;
    // tslint:disable-next-line no-any
    const shutdown = (arg: any) => {
      shutdownIn(arg);
      isShutdown = true;
    };

    const { dir: _dir, ...serverConfigWithoutDir } = this.serverConfig;
    const serverConfig = createServerConfig({
      paths,
      ...serverConfigWithoutDir,
    });

    const maybeLogPath = getLogPath('cli');
    const logPath = maybeLogPath ? maybeLogPath : paths.log;

    const start$ = combineLatest([
      serverConfig.config$.pipe(
        map((conf) => conf.paths.data),
        distinctUntilChanged(),
      ),
      serverConfig.config$.pipe(
        map((conf) => conf.server.port),
        distinctUntilChanged(),
      ),
      serverConfig.config$.pipe(
        map((conf) => conf.httpServer.port),
        distinctUntilChanged(),
      ),
    ]).pipe(
      mergeScan<[string, number, number], ServerManager | undefined>(
        (managerIn, [dataPath, port, httpPort]) =>
          defer(async () => {
            let manager = managerIn;
            const first = manager === undefined;
            if (manager !== undefined) {
              await manager.kill();
            }
            manager = new ServerManager({ dataPath, serverVersion: VERSION });

            if (first) {
              const versionSpinner = ora(`Checking for @neo-one/cli updates...`).start();
              try {
                const newVersion = await manager.getNewerServerVersion();
                if (newVersion === undefined) {
                  versionSpinner.succeed(`@neo-one/cli is current`);
                } else {
                  versionSpinner.warn(
                    `A newer version (${newVersion}) of @neo-one/cli is available for download see https://neo-one.io/docs/environment-setup/#Updating for how to update.`,
                  );
                }
              } catch (error) {
                versionSpinner.fail(`Failed to check @neo-one/cli version; failure: ${error}`);
              }
            }

            const spinner = ora(`Starting ${name.title} server...`).start();

            try {
              const { pid } = await manager.start({
                port,
                httpPort,
                binary: createBinary(argv, this.serverConfig),
              });

              spinner.succeed(`${name.title} server running at (pid=${pid})`);
              this.mutableClient = new Client({ port });

              return manager;
            } catch (error) {
              spinner.fail(`Failed to start ${name.title} server: ${error.message}`);
              throw error;
            }
          }),
        undefined,
        1,
      ),
      switchMap(() => this.client.getPlugins$().pipe(map((pluginName) => this.registerPlugin(pluginName)))),
      publishReplay(1),
      refCount(),
    );

    const subscription = start$.subscribe({
      error: (error) => {
        logger.error({ title: 'cli_uncaught_error', error: error.message }, 'Something went wrong. Shutting down.');
        this.vorpal.log(`Something went wrong: ${error.message}. Shutting down.`);
        shutdownReport(logPath, () => {
          shutdown({ exitCode: 1, error });
        });
      },
      complete: () => {
        const message = 'Something went wrong: CLI unexpectedly exited. Shutting down.';
        logger.error({ title: 'cli_uncaught_complete' }, message);

        this.vorpal.log(message);
        shutdownReport(paths.log, () => {
          shutdown({ exitCode: 1 });
        });
      },
    });

    mutableShutdownFuncs.push(() => subscription.unsubscribe());
    await start$.pipe(take(1)).toPromise();
    const plugins = await this.client.getAllPlugins();
    plugins.forEach((plugin) => this.registerPlugin(plugin));

    if (!isShutdown) {
      commands.forEach((command) => command(this));
      const args = argv.slice(2);
      if (args.length > 0) {
        try {
          this.mutableThrowError = true;
          await this.vorpal.exec(args.join(' '));
          shutdown({ exitCode: 0 });
        } catch {
          shutdown({ exitCode: 1 });
        }
      } else {
        this.resetDelimiter();
        this.vorpal.history(name.cli).show();
      }
    }
  }

  public registerPreHook(nameIn: string, hook: CLIHook): void {
    const preHook = this.mutablePreHooks[nameIn] as CLIHook[] | undefined;
    if (preHook === undefined) {
      this.mutablePreHooks[nameIn] = [];
    }
    this.mutablePreHooks[nameIn].push(hook);
  }

  public registerPostHook(nameIn: string, hook: CLIHook): void {
    const postHook = this.mutablePostHooks[nameIn] as CLIHook[] | undefined;
    if (postHook === undefined) {
      this.mutablePostHooks[nameIn] = [];
    }
    this.mutablePostHooks[nameIn].push(hook);
  }

  public async executeCommandPreHooks(nameIn: string, args: Args): Promise<void> {
    const preHooks = this.mutablePreHooks[nameIn] as CLIHook[] | undefined;
    if (preHooks !== undefined) {
      // tslint:disable-next-line no-loop-statement
      for (const preHook of preHooks) {
        await preHook({ cli: this, args });
      }
    }
  }

  public async executeCommandPostHooks(nameIn: string, args: Args): Promise<void> {
    const postHooks = this.mutablePostHooks[nameIn] as CLIHook[] | undefined;
    if (postHooks !== undefined) {
      // tslint:disable-next-line no-loop-statement
      for (const postHook of postHooks) {
        await postHook({ cli: this, args });
      }
    }
  }

  public async exec(command: string): Promise<void> {
    // tslint:disable-next-line no-any
    const originalNewCommand = (this.vorpal as any).cmdHistory.newCommand;
    // tslint:disable-next-line no-any no-object-mutation
    (this.vorpal as any).cmdHistory.newCommand = () => {
      // do nothing
    };
    try {
      await this.vorpal.execSync(command);
    } finally {
      // tslint:disable-next-line no-object-mutation no-any
      (this.vorpal as any).cmdHistory.newCommand = originalNewCommand;
    }
  }

  public printDescribe(describeTable: DescribeTable, print?: (value: string) => void) {
    this.getPrint(print)(this.getDescribe(describeTable));
  }

  public printList(listTable: ListTable, print?: (value: string) => void) {
    this.getPrint(print)(this.getList(listTable));
  }

  public print(value: string, print?: (value: string) => void): void {
    this.getPrint(print)(value);
  }

  public getResourceType({
    plugin: pluginName,
    resourceType: resourceTypeName,
  }: {
    readonly plugin: string;
    readonly resourceType: string;
  }): ResourceType {
    const plugin = this.mutablePlugins[pluginName] as Plugin | undefined;
    if (plugin === undefined) {
      throw new PluginNotInstalledError(pluginName);
    }

    const resourceType = plugin.resourceTypeByName[resourceTypeName] as ResourceType | undefined;
    if (resourceType === undefined) {
      throw new UnknownPluginResourceType({
        plugin: pluginName,
        resourceType: resourceTypeName,
      });
    }

    return resourceType;
  }

  public getDebug(): DescribeTable {
    return [['Interactive CLI Config Path', this.clientConfig.configPath] as const];
  }
  // tslint:disable-next-line no-any
  public async prompt(questions: readonly any[]): Promise<any> {
    return inquirer.prompt(questions);
  }

  private filterDelimiter(keyIn: string): void {
    this.mutableDelimiter = this.mutableDelimiter.filter(({ key }) => key !== keyIn);
  }

  private setDelimiter(): void {
    if (this.mutableDelimiter.length === 0) {
      this.vorpal.delimiter(`${name.cli}$`);
    } else {
      this.vorpal.delimiter(`${this.mutableDelimiter.map(({ name: delimName }) => delimName).join(' ')}$`);
    }
  }

  private registerPlugin(pluginName: string): void {
    const plugin = this.mutablePlugins[pluginName] as Plugin | undefined;
    if (plugin === undefined) {
      this.mutablePlugins[pluginName] = pluginsUtil.getPlugin({
        logger,
        pluginName,
      });

      createPlugin({
        cli: this,
        plugin: this.mutablePlugins[pluginName],
      });
    }
  }

  private getDescribe(describeTable: DescribeTable): string {
    const mutableTable = getTable();
    // tslint:disable-next-line no-any
    (mutableTable as any).push(
      ...describeTable.map(([keyIn, value]) => {
        const key = `${keyIn}:`;
        if (typeof value === 'string') {
          return { [key]: value };
        }
        if (value.type === 'list') {
          return { [key]: `\n${this.getList(value.table)}` };
        }

        return { [key]: `\n${this.getDescribe(value.table)}` };
      }),
    );

    return mutableTable.toString();
  }

  private getList(listTable: ListTable): string {
    // tslint:disable-next-line no-any
    const mutableTable = getTable(listTable[0] as any);
    // tslint:disable-next-line no-any
    (mutableTable as any).push(...listTable.slice(1));

    return mutableTable.toString();
  }

  private getPrint(printIn?: (value: string) => void): (value: string) => void {
    let print = printIn;
    if (print === undefined) {
      print =
        (this.vorpal.activeCommand as CommandInstance | undefined | null) != undefined
          ? this.vorpal.activeCommand.log.bind(this.vorpal.activeCommand)
          : this.vorpal.log.bind(this.vorpal);
    }

    // tslint:disable-next-line no-any
    return print as any;
  }
}

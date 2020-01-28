const childProcess = require('child_process');

const branchEnv = process.env.CIRCLE_BRANCH;
const renovateRegex = new RegExp(/^(renovate)\/.*/);

const renovate =
  branchEnv === undefined ? false : renovateRegex.test(branchEnv);

const installArgs = ['./install-run-rush.js'].concat(
  renovate ? 'update' : 'install',
);

const runInstallCI = () => {
  const result = childProcess.spawnSync('node', installArgs, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });
  return result.status;
};

runInstallCI();

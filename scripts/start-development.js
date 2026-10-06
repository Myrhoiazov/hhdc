const { spawn } = require('node:child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const isWindows = process.platform === 'win32';
const processes = [
    spawn(npmCommand, ['--prefix', 'server', 'start'], {
        detached: !isWindows,
        stdio: 'inherit',
    }),
    spawn(npmCommand, ['--prefix', 'client', 'start'], {
        detached: !isWindows,
        stdio: 'inherit',
    }),
];

let isStopping = false;

function stop(exitCode = 0) {
    if (isStopping) {
        return;
    }

    isStopping = true;
    processes.forEach((childProcess) => {
        if (childProcess.killed || childProcess.pid === undefined) {
            return;
        }

        try {
            process.kill(isWindows ? childProcess.pid : -childProcess.pid, 'SIGTERM');
        } catch (error) {
            if (error.code !== 'ESRCH') {
                console.error(error);
            }
        }
    });
    process.exitCode = exitCode;
}

processes.forEach((childProcess) => {
    childProcess.on('error', (error) => {
        console.error(error);
        stop(1);
    });

    childProcess.on('exit', (code, signal) => {
        if (!isStopping) {
            stop(signal ? 1 : (code ?? 0));
        }
    });
});

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

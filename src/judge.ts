import { spawn } from 'child_process';
import { resolve as resolvePath } from 'path';

export class JudgeCompileError extends Error {
  error: string;
  file: string;

  constructor(message: string, file: string) {
    super('Compiler exited with a non-zero code');
    this.error = message;
    this.file = file;
  }
}

export class JudgeRuntimeError extends Error {

}

export class JudgeWrongAnswerError extends Error {
  expected: string;
  got: string;

  constructor(expected: string, got: string) {
    super(`Wrong Answer!\n- Expected:\n${expected}\n- Got\n${got}`);
    this.expected = JSON.stringify(expected);
    this.got = JSON.stringify(got);
  }
}

export class JudgeTimeLimitExceededError extends Error {
  limit: number;
  constructor(limit: number) {
    super(`Time limit exceeded: ${limit}`);
    this.limit = limit;
  }
}

const normalize = (str: string) => str.replaceAll('\\r\\n', '\\n')
  .trim();

const compileFile = (inFilePath: string, outFilePath: string) =>
  new Promise<void>((resolve, reject) => {
    const compiler = spawn('g++', [inFilePath, '-o', outFilePath]);

    let stderrChunks: Uint8Array[] = [];
    compiler.stderr.on('data', (data: Uint8Array) => {
      stderrChunks = stderrChunks.concat(data);
    });

    compiler.on('exit', (code) => {
      if (code != 0) {
        const stderrContent = Buffer.concat(stderrChunks)
          .toString();
        reject(new JudgeCompileError(stderrContent, inFilePath));
      }
      resolve();
    });
  });

const executeJudge = (
  filePath: string,
  input: string,
  expectedOutput: string,
) =>
  new Promise<void>((resolve, reject) => {
    const process = spawn(filePath);

    process.stdin.write(input);
    process.stdin.end();

    let stderrChunks: Uint8Array[] = [];
    process.stderr.on('data', (data: Uint8Array) => {
      stderrChunks = stderrChunks.concat(data);
    });

    let stdoutChunks: Uint8Array[] = [];
    process.stdout.on('data', (data: Uint8Array) => {
      stdoutChunks = stdoutChunks.concat(data);
    });

    process.on('exit', (code) => {
      if (code != 0) {
        const stderrContent = Buffer.concat(stderrChunks)
          .toString();
        reject(new JudgeRuntimeError(stderrContent));
        return;
      }

      const result = Buffer.concat(stdoutChunks)
        .toString();
      const normalizedOutput = normalize(result);
      const normalizedExpected = normalize(expectedOutput);

      if (
        normalizedOutput == normalizedExpected
        || normalizedOutput == normalizedExpected + '\n'
      ) {
        resolve();
      }
      else {
        reject(new JudgeWrongAnswerError(normalizedExpected, normalizedOutput));
      }
    });
  });

export const checkresult = async (
  input: string,
  expectedOutput: string,
  path: string,
) => {
  const outFilePath = resolvePath('.cache', 'hw.exe');

  await compileFile(path, outFilePath);
  await executeJudge(outFilePath, input.trim(), expectedOutput.trim());
};
//

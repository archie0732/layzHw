import { resolve } from 'path';
import {
  JudgeCompileError,
  JudgeRuntimeError,
  JudgeTimeLimitExceededError,
  JudgeWrongAnswerError,
  checkresult,
} from './judge';
import { readdirSync, writeFileSync } from 'fs';
import logger from './logger';

export const check = async (input: string, output: string, path: string) => {
  const folder = readdirSync(path);

  const result = [];

  for (const files of folder) {
    try {
      await checkresult(input, output, path + '/' + files);
      const tem = {
        fileName: files,
        result: 'AC',
        expect: output,
        recieve: output,
      };
      result.push(tem);
    }
    catch (e) {
      if (!(e instanceof Error)) throw e;
      const tem = {
        fileName: '',
        result: '',
        expect: 'null',
        recieve: 'null',
      };
      switch (e.constructor) {
        case JudgeCompileError: {
          tem.result = 'CE';
          tem.fileName = files.toString();
          break;
        }

        case JudgeRuntimeError: {
          tem.result = 'RE';
          tem.fileName = files;
          break;
        }

        case JudgeWrongAnswerError: {
          const error = e as JudgeWrongAnswerError;
          tem.result = 'WA';
          tem.fileName = files;
          tem.expect = error.expected;
          tem.recieve = error.got;
          break;
        }

        case JudgeTimeLimitExceededError: {
          tem.result = 'TLE';
          tem.fileName = files.toString();
          break;
        }

        default: {
          const error = e;
          tem.result = 'TLE';
          tem.fileName = files.toString();
          tem.recieve = error.message;
          break;
        }
      }
      logger.info(`${files}: ${tem.result}`);
      if (e instanceof JudgeWrongAnswerError) {
        console.log(JSON.stringify(e.got));
        console.log(JSON.stringify(e.expected));
      }
      result.push(tem);
    }
  }
  writeFileSync(
    resolve('.cache', 'result.json'),
    JSON.stringify(result, null, 2),
    'utf-8',
  );
};

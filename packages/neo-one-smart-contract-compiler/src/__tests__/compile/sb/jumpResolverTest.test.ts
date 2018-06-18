import { Jmp, Jump } from '../../../compile/pc';
import { KnownProgramCounter } from '../../../compile/pc/KnownProgramCounter';
import { JumpResolver } from '../../../compile/sb/JumpResolver';

/*describe('FixedSpaceBothDirectionTest', () => {
  test('simple', async () => {
    const newResolver = new JumpResolver();

    const testArray = [
      Buffer.alloc(BUFFER_SIZE),
      newJump(BUFFER_SIZE * (1 + 31) + 3),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      Buffer.alloc(BUFFER_SIZE),
      newJump(0),
      Buffer.alloc(BUFFER_SIZE),
    ];

    const newResolve = newResolver.process(testArray);

    expect(newResolve);
  });
});*/

describe('RandomSpaceOmnidirectionalTest', () => {
  test('simple', async () => {
    const newResolver = new JumpResolver();

    const testArray = () => {
      let test: Array<Buffer | Jump> = [];
      let iter = 0;
      let currByte = 0;
      let newBuffer = Buffer.alloc(Math.floor(Math.random() * 5) + 3);

      // tslint:disable-next-line no-loop-statement
      while (iter < 100) {
        test = test.concat(newBuffer);
        currByte = currByte + newBuffer.length;
        iter = iter + 1;
        newBuffer = Buffer.alloc(Math.floor(Math.random() * 5) + 3);
      }

      // tslint:disable-next-line no-array-mutation
      test.unshift(new Jmp('JMP', new KnownProgramCounter(currByte + 3)));
      // tslint:disable-next-line no-array-mutation
      test.push(new Jmp('JMP', new KnownProgramCounter(3)));

      return test;
    };

    const result = newResolver.process(testArray());
    expect(result);
  });
});

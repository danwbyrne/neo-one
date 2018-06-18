import { Call, Jmp, Jump, JumpOp } from '../pc';
import { KnownProgramCounter } from '../pc/KnownProgramCounter';

export type Bytecode = ReadonlyArray<Buffer | Jump>;
type RelativeBytecode = ReadonlyArray<RelativeCall>;

const MAX_OFFSET = 32;

interface RelativeCallOptions {
  readonly source: number;
  readonly target: number;
  readonly length: number;
}

abstract class RelativeCall {
  public readonly source: number;
  public readonly target: number;
  public readonly length: number;

  public constructor(options: RelativeCallOptions) {
    this.source = options.source;
    this.target = options.target;
    this.length = options.length;
  }
}

class RelativeBuffer extends RelativeCall {
  public readonly bufferPayload: Buffer;
  public constructor(public readonly startingByte: number, public readonly buffer: Buffer) {
    super({
      source: startingByte,
      target: startingByte + buffer.length,
      length: buffer.length,
    });

    this.bufferPayload = buffer;
  }

  public readonly toString = (): string => `${this.source} B ${this.target}\n`;
}

class RelativeJump extends RelativeCall {
  public readonly opStorage: JumpOp;
  public constructor(
    public readonly startingByte: number,
    public readonly pc: number,
    public readonly op: JumpOp = 'JMP',
  ) {
    super({
      source: startingByte,
      target: pc,
      length: 3,
    });
    this.opStorage = op;
  }

  public readonly toString = () => `${this.source} J ${this.target}\n`;
}

class JumpStation extends RelativeCall {
  public readonly relays: ReadonlyArray<RelativeJump> = [];

  public constructor(public readonly startingByte: number, public readonly jumps: ReadonlyArray<RelativeJump> = []) {
    super({
      source: startingByte,
      target: startingByte + getStationSize(jumps),
      length: getStationSize(jumps),
    });

    this.relays = jumps;
  }

  public readonly toString = (): string => `${this.source} S ${this.target} ${this.formatJumps()}`;

  private readonly formatJumps = (): string => {
    if (this.relays.length === 0) {
      return '\n';
    }

    return this.relays.map((relay) => `\n ${relay}`).join();
  };
}

const getStationSize = (jumps: RelativeBytecode) => {
  if (jumps.length === 0) {
    return 0;
  }

  return (jumps.length + 1) * 3;
};

// update commands for RelativeCalls
const updateRelativeBuffer = (relativeBuffer: RelativeBuffer, insertionByte: number, bytes = 3): RelativeBuffer => {
  const newSource = () => {
    if (insertionByte <= relativeBuffer.source) {
      return relativeBuffer.source + bytes;
    }

    return relativeBuffer.source;
  };

  return new RelativeBuffer(newSource(), relativeBuffer.bufferPayload);
};

const updateRelativeJump = (jump: RelativeJump, insertionByte: number, bytes = 3): RelativeJump => {
  const newSource = () => {
    if (insertionByte <= jump.source) {
      return jump.source + bytes;
    }

    return jump.source;
  };

  const newTarget = () => {
    if (insertionByte <= jump.target) {
      return jump.target + bytes;
    }

    return jump.target;
  };

  return new RelativeJump(newSource(), newTarget());
};

const updateJumpStation = (station: JumpStation, insertionByte: number, bytes = 3): JumpStation => {
  const newSource = () => {
    if (insertionByte < station.source) {
      return station.source + bytes;
    }

    return station.source;
  };

  const updatedJumps = station.relays.map((relay) => updateRelativeJump(relay, insertionByte, bytes));

  return new JumpStation(newSource(), updatedJumps);
};

const redirectJump = (relativeStack: RelativeBytecode, jumpSource: number, newPC: number): RelativeBytecode => {
  // console.log(`trying to redirect jump at: ${jumpSource} to target: ${newPC}`);
  let newRelativeStack: RelativeCall[] = [];
  relativeStack.forEach((call) => {
    if (call instanceof RelativeJump && call.source === jumpSource) {
      newRelativeStack = newRelativeStack.concat(new RelativeJump(call.source, newPC));
    } else if (call instanceof JumpStation && call.relays.some((relay) => relay.source === jumpSource)) {
      const updatedRelays = call.relays.map((relay) => {
        if (relay.source === jumpSource) {
          return new RelativeJump(relay.source, newPC);
        }

        return relay;
      });
      newRelativeStack = newRelativeStack.concat(new JumpStation(call.source, updatedRelays));
    } else {
      newRelativeStack = newRelativeStack.concat(call);
    }
  });

  return newRelativeStack;
};

const relayCheck = (station: JumpStation, jump: RelativeJump) => {
  let minimizedDiff: number;
  let potentialRelaySource = station.target;
  const offset = 3;
  if (station.length === 0) {
    potentialRelaySource = station.source + 3;
  }
  if (jump.target > station.source) {
    minimizedDiff = Math.abs(
      Math.abs(potentialRelaySource - (jump.target + offset)) - Math.abs(potentialRelaySource - jump.source),
    );
  } else if (station.source > jump.target) {
    minimizedDiff = Math.abs(
      Math.abs(potentialRelaySource - jump.target) - Math.abs(potentialRelaySource - (jump.source + offset)),
    );
  } else {
    return MAX_OFFSET * 10;
  }

  return minimizedDiff;
};

const addRelayJump = (relativeStack: RelativeBytecode, jump: RelativeJump, station: JumpStation): RelativeBytecode => {
  let targetByte = jump.target;
  let sourceByte = jump.source;
  let newStation: JumpStation;
  let top: RelativeBytecode;
  let bottom: RelativeBytecode;
  let offset = 3;

  top = relativeStack.filter((call) => call.source < station.source && call !== station);
  bottom = relativeStack.filter((call) => call.source >= station.source && call !== station);

  if (station.length === 0) {
    offset = 6;
    top = updateRelativeStack(top, station.source, offset);
    bottom = updateRelativeStack(bottom, station.source, offset);
  } else {
    top = updateRelativeStack(top, station.target, offset);
    bottom = updateRelativeStack(bottom, station.target, offset);
  }

  if (targetByte > station.source) {
    targetByte += offset;
  }
  if (sourceByte > station.source) {
    sourceByte += offset;
  }

  newStation = new JumpStation(
    station.source,
    station.relays.concat(new RelativeJump(station.target + offset - 3, targetByte)),
  );

  return redirectJump(top.concat(newStation, bottom), sourceByte, newStation.target - 3);
};

const updateRelativeStack = (relativeStack: RelativeBytecode, insertionByte: number, bytes = 3): RelativeBytecode => {
  let newRelativeStack: RelativeBytecode = [];
  relativeStack.forEach((call) => {
    if (call instanceof RelativeBuffer) {
      newRelativeStack = newRelativeStack.concat(updateRelativeBuffer(call, insertionByte, bytes));
    }
    if (call instanceof RelativeJump) {
      newRelativeStack = newRelativeStack.concat(updateRelativeJump(call, insertionByte, bytes));
    }

    if (call instanceof JumpStation) {
      newRelativeStack = newRelativeStack.concat(updateJumpStation(call, insertionByte, bytes));
    }
  });

  return newRelativeStack;
};

const isRelativeJump = (call: RelativeCall): call is RelativeJump => call instanceof RelativeJump;
const isJumpStation = (call: RelativeCall): call is JumpStation => call instanceof JumpStation;

// helper functions for filtering and finding relativeCalls at byte locations.
const getRelativeJumps = (relativeStack: RelativeBytecode): ReadonlyArray<RelativeJump> =>
  relativeStack.filter(isRelativeJump);

const getJumpStations = (relativeStack: RelativeBytecode): ReadonlyArray<JumpStation> =>
  relativeStack.filter(isJumpStation);

const getProblemJumps = (relativeStack: RelativeBytecode): ReadonlyArray<RelativeJump> => {
  let stationJumps: RelativeJump[] = [];

  getJumpStations(relativeStack).forEach((station) => {
    stationJumps = stationJumps.concat(station.relays);
  });

  return getRelativeJumps(relativeStack)
    .concat(stationJumps)
    .filter((call) => Math.abs(call.source - call.target) >= MAX_OFFSET);
};

const getNextProblemJump = (jumps: ReadonlyArray<RelativeJump>): RelativeJump => {
  if (jumps.length === 0) {
    throw new Error('looks like we have no problem jumps');
  }

  return jumps.reduce((left, right) => {
    if (Math.abs(left.target - left.source) > Math.abs(right.target - right.source)) {
      return left;
    }

    return right;
  });
};

const getResolvingStation = (relativeStack: RelativeBytecode, jump: RelativeJump) => {
  const stations = getJumpStations(relativeStack);

  return stations.reduce((left, right) => {
    if (relayCheck(left, jump) <= relayCheck(right, jump)) {
      return left;
    }

    return right;
  });
};

const getBuffer = (relBuffer: RelativeBuffer): Buffer => Buffer.from(relBuffer.bufferPayload);

const getJump = (relJump: RelativeJump): Jump => {
  if (relJump.opStorage === 'CALL') {
    return new Call(new KnownProgramCounter(relJump.target));
  }

  return new Jmp(relJump.opStorage, new KnownProgramCounter(relJump.target));
};

const getFlattenedStation = (relStation: JumpStation): ReadonlyArray<Jump> => {
  let flattenedStation = Array<Jmp>();
  if (relStation.length !== 0) {
    flattenedStation = flattenedStation.concat(new Jmp('JMP', new KnownProgramCounter(relStation.target)));
    relStation.relays.forEach((relay) => {
      flattenedStation = flattenedStation.concat(new Jmp('JMP', new KnownProgramCounter(relay.target)));
    });
  }

  return flattenedStation;
};

// we apply empty length jump stations wherever we can, so that we can calculate the best place for linking relays.
const applyJumpStations = (relativeBytecode: RelativeBytecode): RelativeBytecode => {
  let newRelativeStack = Array<RelativeCall>();
  relativeBytecode.forEach((call) => {
    newRelativeStack = newRelativeStack.concat(call);
    newRelativeStack = newRelativeStack.concat(new JumpStation(call.source + call.length));
  });

  return newRelativeStack;
};

// we try and link up the next worst offset jump
const fixNextProblem = (
  relativeBytecode: RelativeBytecode,
  problemJumps: ReadonlyArray<RelativeJump>,
): RelativeBytecode => {
  const targetJump = getNextProblemJump(problemJumps);
  const targetStation = getResolvingStation(relativeBytecode, targetJump);
  // console.log(`${problemJumps}`);
  // console.log(`We are going to try and fix jump: ${targetJump} by linking it to station: ${targetStation}`);

  return addRelayJump(relativeBytecode, targetJump, targetStation);
};

export class JumpResolver {
  public process(bytecode: Bytecode): Bytecode {
    console.log(`Got some bytecode`);
    this.printBytecode(bytecode);
    let relativeStack = applyJumpStations(this.getRelativeStack(bytecode));
    let problems = getProblemJumps(relativeStack);
    // this.printRelativeBytecode(relativeStack);

    // tslint:disable-next-line no-loop-statement
    while (problems.length !== 0) {
      // console.log('fixing a problem jump');
      relativeStack = fixNextProblem(relativeStack, problems);
      // this.printRelativeBytecode(relativeStack);
      problems = getProblemJumps(relativeStack);
    }
    this.printBytecode(this.flattenRelativeBytecode(relativeStack));

    return this.flattenRelativeBytecode(relativeStack);
  }

  private printRelativeBytecode(relativeBytecode: RelativeBytecode): void {
    console.log(`${relativeBytecode}`);
  }

  private printBytecode(bytecode: Bytecode): void {
    let currByte = 0;
    let outString = '';
    bytecode.forEach((call) => {
      if (call instanceof Buffer) {
        outString = `${outString}${currByte} BUFF ${currByte + call.length}\n`;
        currByte += call.length;
      }
      if (call instanceof Jump) {
        outString = `${outString}${currByte} JUMP ${call.pc.getPC()}\n`;
        currByte += 3;
      }
    });
    console.log(`${outString}`);
  }

  private getRelativeStack(bytecode: ReadonlyArray<Buffer | Jump>): RelativeBytecode {
    let byteIndex = 0;
    let newRelativeCall: RelativeCall;

    return bytecode.map((call) => {
      if (call instanceof Buffer) {
        newRelativeCall = new RelativeBuffer(byteIndex, call);
      } else if (call instanceof Jump) {
        newRelativeCall = new RelativeJump(byteIndex, call.pc.getPC(), call.op);
      }
      byteIndex += newRelativeCall.length;

      return newRelativeCall;
    });
  }

  private flattenRelativeBytecode(relativeBytecode: RelativeBytecode): Bytecode {
    let finalizedBytecode: Bytecode = [];
    relativeBytecode.forEach((call) => {
      if (call instanceof RelativeBuffer) {
        finalizedBytecode = finalizedBytecode.concat(getBuffer(call));
      } else if (call instanceof RelativeJump) {
        finalizedBytecode = finalizedBytecode.concat(getJump(call));
      } else if (call instanceof JumpStation) {
        getFlattenedStation(call).forEach((obj) => {
          finalizedBytecode = finalizedBytecode.concat(obj);
        });
      }
    });

    return finalizedBytecode;
  }
}

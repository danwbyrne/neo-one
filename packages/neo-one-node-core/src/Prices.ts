import { common, Op } from '@neo-one/client-common';
import { BN } from 'bn.js';
import { InvalidOpCodeError } from './errors';

export const ECDsaVerifyPrice = common.fixed8FromDecimal('.01');

const opCodePrices: Record<Op, BN | undefined> = {
  [Op.PUSHINT8]: new BN(30),
  [Op.PUSHINT16]: new BN(30),
  [Op.PUSHINT32]: new BN(30),
  [Op.PUSHINT64]: new BN(30),
  [Op.PUSHINT128]: new BN(120),
  [Op.PUSHINT256]: new BN(120),
  [Op.PUSHA]: new BN(120),
  [Op.PUSHNULL]: new BN(30),
  [Op.PUSHDATA1]: new BN(180),
  [Op.PUSHDATA2]: new BN(13000),
  [Op.PUSHDATA4]: new BN(110000),
  [Op.PUSHM1]: new BN(30),
  [Op.PUSH0]: new BN(30),
  [Op.PUSH1]: new BN(30),
  [Op.PUSH2]: new BN(30),
  [Op.PUSH3]: new BN(30),
  [Op.PUSH4]: new BN(30),
  [Op.PUSH5]: new BN(30),
  [Op.PUSH6]: new BN(30),
  [Op.PUSH7]: new BN(30),
  [Op.PUSH8]: new BN(30),
  [Op.PUSH9]: new BN(30),
  [Op.PUSH10]: new BN(30),
  [Op.PUSH11]: new BN(30),
  [Op.PUSH12]: new BN(30),
  [Op.PUSH13]: new BN(30),
  [Op.PUSH14]: new BN(30),
  [Op.PUSH15]: new BN(30),
  [Op.PUSH16]: new BN(30),
  [Op.NOP]: new BN(30),
  [Op.JMP]: new BN(70),
  [Op.JMP_L]: new BN(70),
  [Op.JMPIF]: new BN(70),
  [Op.JMPIF_L]: new BN(70),
  [Op.JMPIFNOT]: new BN(70),
  [Op.JMPIFNOT_L]: new BN(70),
  [Op.JMPEQ]: new BN(70),
  [Op.JMPEQ_L]: new BN(70),
  [Op.JMPNE]: new BN(70),
  [Op.JMPNE_L]: new BN(70),
  [Op.JMPGT]: new BN(70),
  [Op.JMPGT_L]: new BN(70),
  [Op.JMPGE]: new BN(70),
  [Op.JMPGE_L]: new BN(70),
  [Op.JMPLT]: new BN(70),
  [Op.JMPLT_L]: new BN(70),
  [Op.JMPLE]: new BN(70),
  [Op.JMPLE_L]: new BN(70),
  [Op.CALL]: new BN(22000),
  [Op.CALL_L]: new BN(22000),
  [Op.CALLA]: new BN(22000),
  [Op.ABORT]: new BN(30),
  [Op.ASSERT]: new BN(30),
  [Op.THROW]: new BN(22000),
  [Op.TRY]: new BN(100),
  [Op.TRY_L]: new BN(100),
  [Op.ENDTRY]: new BN(100),
  [Op.ENDTRY_L]: new BN(100),
  [Op.ENDFINALLY]: new BN(100),
  [Op.RET]: new BN(0),
  [Op.SYSCALL]: new BN(0),
  [Op.DEPTH]: new BN(60),
  [Op.DROP]: new BN(60),
  [Op.NIP]: new BN(60),
  [Op.XDROP]: new BN(400),
  [Op.CLEAR]: new BN(400),
  [Op.DUP]: new BN(60),
  [Op.OVER]: new BN(60),
  [Op.PICK]: new BN(60),
  [Op.TUCK]: new BN(60),
  [Op.SWAP]: new BN(60),
  [Op.ROT]: new BN(60),
  [Op.ROLL]: new BN(400),
  [Op.REVERSE3]: new BN(60),
  [Op.REVERSE4]: new BN(60),
  [Op.REVERSEN]: new BN(400),
  [Op.INITSSLOT]: new BN(400),
  [Op.INITSLOT]: new BN(800),
  [Op.LDSFLD0]: new BN(60),
  [Op.LDSFLD1]: new BN(60),
  [Op.LDSFLD2]: new BN(60),
  [Op.LDSFLD3]: new BN(60),
  [Op.LDSFLD4]: new BN(60),
  [Op.LDSFLD5]: new BN(60),
  [Op.LDSFLD6]: new BN(60),
  [Op.LDSFLD]: new BN(60),
  [Op.STSFLD0]: new BN(60),
  [Op.STSFLD1]: new BN(60),
  [Op.STSFLD2]: new BN(60),
  [Op.STSFLD3]: new BN(60),
  [Op.STSFLD4]: new BN(60),
  [Op.STSFLD5]: new BN(60),
  [Op.STSFLD6]: new BN(60),
  [Op.STSFLD]: new BN(60),
  [Op.LDLOC0]: new BN(60),
  [Op.LDLOC1]: new BN(60),
  [Op.LDLOC2]: new BN(60),
  [Op.LDLOC3]: new BN(60),
  [Op.LDLOC4]: new BN(60),
  [Op.LDLOC5]: new BN(60),
  [Op.LDLOC6]: new BN(60),
  [Op.LDLOC]: new BN(60),
  [Op.STLOC0]: new BN(60),
  [Op.STLOC1]: new BN(60),
  [Op.STLOC2]: new BN(60),
  [Op.STLOC3]: new BN(60),
  [Op.STLOC4]: new BN(60),
  [Op.STLOC5]: new BN(60),
  [Op.STLOC6]: new BN(60),
  [Op.STLOC]: new BN(60),
  [Op.LDARG0]: new BN(60),
  [Op.LDARG1]: new BN(60),
  [Op.LDARG2]: new BN(60),
  [Op.LDARG3]: new BN(60),
  [Op.LDARG4]: new BN(60),
  [Op.LDARG5]: new BN(60),
  [Op.LDARG6]: new BN(60),
  [Op.LDARG]: new BN(60),
  [Op.STARG0]: new BN(60),
  [Op.STARG1]: new BN(60),
  [Op.STARG2]: new BN(60),
  [Op.STARG3]: new BN(60),
  [Op.STARG4]: new BN(60),
  [Op.STARG5]: new BN(60),
  [Op.STARG6]: new BN(60),
  [Op.STARG]: new BN(60),
  [Op.NEWBUFFER]: new BN(80000),
  [Op.MEMCPY]: new BN(80000),
  [Op.CAT]: new BN(80000),
  [Op.SUBSTR]: new BN(80000),
  [Op.LEFT]: new BN(80000),
  [Op.RIGHT]: new BN(80000),
  [Op.INVERT]: new BN(100),
  [Op.AND]: new BN(200),
  [Op.OR]: new BN(200),
  [Op.XOR]: new BN(200),
  [Op.EQUAL]: new BN(200),
  [Op.NOTEQUAL]: new BN(200),
  [Op.SIGN]: new BN(100),
  [Op.ABS]: new BN(100),
  [Op.NEGATE]: new BN(100),
  [Op.INC]: new BN(100),
  [Op.DEC]: new BN(100),
  [Op.ADD]: new BN(200),
  [Op.SUB]: new BN(200),
  [Op.MUL]: new BN(300),
  [Op.DIV]: new BN(300),
  [Op.MOD]: new BN(300),
  [Op.SHL]: new BN(300),
  [Op.SHR]: new BN(300),
  [Op.NOT]: new BN(100),
  [Op.BOOLAND]: new BN(200),
  [Op.BOOLOR]: new BN(200),
  [Op.NZ]: new BN(100),
  [Op.NUMEQUAL]: new BN(200),
  [Op.NUMNOTEQUAL]: new BN(200),
  [Op.LT]: new BN(200),
  [Op.LE]: new BN(200),
  [Op.GT]: new BN(200),
  [Op.GE]: new BN(200),
  [Op.MIN]: new BN(200),
  [Op.MAX]: new BN(200),
  [Op.WITHIN]: new BN(200),
  [Op.PACK]: new BN(7000),
  [Op.UNPACK]: new BN(7000),
  [Op.NEWARRAY0]: new BN(400),
  [Op.NEWARRAY]: new BN(15000),
  [Op.NEWARRAY_T]: new BN(15000),
  [Op.NEWSTRUCT0]: new BN(400),
  [Op.NEWSTRUCT]: new BN(15000),
  [Op.NEWMAP]: new BN(200),
  [Op.SIZE]: new BN(150),
  [Op.HASKEY]: new BN(270000),
  [Op.KEYS]: new BN(500),
  [Op.VALUES]: new BN(7000),
  [Op.PICKITEM]: new BN(270000),
  [Op.APPEND]: new BN(15000),
  [Op.SETITEM]: new BN(270000),
  [Op.REVERSEITEMS]: new BN(500),
  [Op.REMOVE]: new BN(500),
  [Op.CLEARITEMS]: new BN(400),
  [Op.ISNULL]: new BN(60),
  [Op.ISTYPE]: new BN(60),
  [Op.CONVERT]: new BN(80000),
};

// tslint:disable-next-line: export-name
export const getOpCodePrice = (value: Op): BN => {
  const fee = opCodePrices[value];
  if (fee === undefined) {
    throw new InvalidOpCodeError(value);
  }

  return fee;
};
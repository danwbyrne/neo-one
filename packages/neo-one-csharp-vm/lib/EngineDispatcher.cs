using System;
using System.Threading.Tasks;
using Neo.Network.P2P.Payloads;
using Neo.Persistence;
using System.Linq;
using Neo.VM;
using Neo.VM.Types;
using Neo.SmartContract;
using Neo.Ledger;
// using Neo.Plugins;
using static System.IO.Path;
using System.Reflection;

namespace NEOONE
{

  public class NeoOneBlockchain
  {
    public static readonly Neo.NeoSystem NeoOneSystem;

    static NeoOneBlockchain()
    {
      Console.WriteLine("Initializing NeoSystem");
      NeoOneSystem = new Neo.NeoSystem();

      var _ = Blockchain.Singleton;
    }

    public static bool InitializeNeoOneSystem()
    {
      return true;
    }
  }
  public class EngineDispatcher
  {

    private ApplicationEngine engine;
    private Neo.NeoSystem system;
    private bool init = false;
    public async Task<object> Invoke(dynamic input)
    {
      if (!this.init)
      {
        this.init = NeoOneBlockchain.InitializeNeoOneSystem();
      }

      string method = (string)input.method;

      switch (method)
      {
        // constructor wrapper
        case "create":
          TriggerType trigger = (TriggerType)input.args.trigger;
          long gas = (long)input.args.gas;
          bool testMode = (bool)input.args.testMode;
          return this._create(trigger, null, null, gas, testMode);

        case "createwithsnapshot":
          TriggerType ssTrigger = (TriggerType)input.args.trigger;
          long ssGas = (long)input.args.gas;
          bool ssTestMode = (bool)input.args.testMode;
          var snapshot = Blockchain.Singleton.GetSnapshot();
          return this._create(ssTrigger, null, snapshot, ssGas, ssTestMode);

        case "test":
          return this._test();

        // getters
        case "gettrigger":
          return this._getTrigger();

        case "getvmstate":
          return this._getVMState();

        case "getresultstack":
          return this._getResultStack();

        // application engine methods
        case "execute":
          return this._execute();

        case "loadscript":
          byte[] rawBytes = (byte[])input.args.script;
          int scriptPosition = (int)input.args.position;
          var script = new Script(rawBytes);
          return this._loadScript(script, scriptPosition);

        // execution engine methods
        case "loadclonedcontext":
          int position = (int)input.args.position;
          return this._loadClonedContext(position);

        case "peek":
          int peekPosition = (int)input.args.position;
          return this._peek(peekPosition);

        case "pop":
          return this._pop();

        case "dispose":
          return this._dispose();

        default:
          throw new InvalidOperationException($"'{method}' is not a valid method");
      }
    }

    private bool _create(TriggerType trigger, IVerifiable container, StoreView snapshot, long gas, bool testMode = false)
    {
      if (this.engine == null)
      {
        this.engine = ApplicationEngine.Create(trigger, container, snapshot, gas, testMode);
      }

      return true;
    }

    private TriggerType _getTrigger()
    {
      this.isInitialized();
      return this.engine.Trigger;
    }

    private dynamic[] _getResultStack()
    {
      this.isInitialized();
      var stack = this.engine.ResultStack.ToArray();
      var test = stack.Select((StackItem p) => ReturnHelpers.convertStackItem(p)).ToArray();

      return test;
    }

    private VMState _getVMState()
    {
      this.isInitialized();
      return this.engine.State;
    }

    private VMState _execute()
    {
      this.isInitialized();
      return this.engine.Execute();
    }

    private ExecutionContext _loadClonedContext(int initialPosition)
    {
      this.isInitialized();
      return this.engine.LoadClonedContext(initialPosition);
    }

    private bool _loadScript(Script script, int initialPosition)
    {
      this.isInitialized();
      this.engine.LoadScript(script);
      return true;
    }

    private StackItem _peek(int index)
    {
      this.isInitialized();
      return this.engine.Peek(index);
    }

    private StackItem _pop()
    {
      this.isInitialized();
      return this.engine.Pop();
    }

    private dynamic _test()
    {
      this.isInitialized();
      Console.WriteLine("HELLLLLLLOOOOOO");

      return true;
    }

    private bool _dispose()
    {
      this.isInitialized();
      this.engine.Dispose();
      return true;
    }

    private bool isInitialized()
    {
      if (this.engine == null)
      {
        throw new InvalidOperationException("Can't invoke a method without creating the engine");
      }

      return true;
    }
  }

  public class ReturnHelpers
  {
    public class PrimitiveReturn
    {
      public readonly dynamic value;
      public readonly int Size;
      public readonly bool IsNull;
      public readonly StackItemType Type;

      public PrimitiveReturn(PrimitiveType item, dynamic value)
      {
        this.value = value;
        this.Size = item.Size;
        this.IsNull = item.IsNull;
        this.Type = item.Type;
      }
    }

    public class PointerReturn
    {
      public readonly byte[] value;
      public readonly int Position;
      public StackItemType Type => StackItemType.Pointer;
      public readonly bool IsNull;

      public PointerReturn(Neo.VM.Types.Pointer item)
      {
        this.value = (byte[])item.Script;
        this.Position = item.Position;
        this.IsNull = item.IsNull;
      }
    }

    public class ArrayReturn
    {
      public dynamic[] value;
      public readonly int Count;
      public StackItemType Type => StackItemType.Array;
      public readonly bool IsNull;

      public ArrayReturn(Neo.VM.Types.Array item)
      {
        this.Count = item.Count;
        this.IsNull = item.IsNull;
        this.value = item.ToArray().Select((p) => convertStackItem(p)).ToArray();
      }
    }

    public class StructReturn
    {
      public dynamic[] value;
      public readonly int Count;
      public StackItemType Type => StackItemType.Struct;
      public readonly bool IsNull;

      public StructReturn(Struct item)
      {
        this.Count = item.Count;
        this.IsNull = item.IsNull;
        this.value = item.ToArray().Select((p) => convertStackItem(p)).ToArray();
      }
    }

    public class KeyValueReturn
    {
      public PrimitiveReturn key;
      public dynamic value;

      public KeyValueReturn(PrimitiveReturn key, dynamic value)
      {
        this.key = key;
        this.value = value;
      }
    }

    public class MapReturn
    {
      public KeyValueReturn[] value;
      public readonly int Count;
      public readonly bool IsNull;
      public StackItemType Type => StackItemType.Map;

      public MapReturn(Map item)
      {
        this.Count = item.Count;
        this.IsNull = item.IsNull;
        this.value = item.ToArray().Select((keyValue) =>
        {
          return new KeyValueReturn(
                  convertStackItem(keyValue.Key),
                  convertStackItem(keyValue.Value)
                );
        }).ToArray();
      }
    }

    public class InteropInterfaceReturn
    {
      public dynamic value;
      public StackItemType Type => StackItemType.InteropInterface;
      public readonly bool IsNull;

      public InteropInterfaceReturn(InteropInterface item)
      {
        this.value = item.GetInterface<dynamic>();
        this.IsNull = item.IsNull;
      }
    }

    public static PrimitiveReturn convertStackItem(PrimitiveType item)
    {
      return item.Type switch
      {
        StackItemType.Boolean => new PrimitiveReturn(item, item.GetBoolean()),
        StackItemType.Integer => new PrimitiveReturn(item, item.GetInteger().ToByteArray()),
        StackItemType.ByteString => new PrimitiveReturn(item, item.GetSpan().ToArray()),
        _ => throw new ArgumentException($"{item.Type} is not a valid StackItem argument")
      };
    }

    public static dynamic convertStackItem(StackItem item)
    {
      return item.Type switch
      {
        StackItemType.Any => item,
        StackItemType.Buffer => item,
        StackItemType.Pointer => new PointerReturn((Neo.VM.Types.Pointer)item),
        StackItemType.Array => new ArrayReturn((Neo.VM.Types.Array)item),
        StackItemType.Struct => new StructReturn((Struct)item),
        StackItemType.Map => new MapReturn((Map)item),
        StackItemType.InteropInterface => new InteropInterfaceReturn((InteropInterface)item),
        _ => convertStackItem((PrimitiveType)item)
      };
    }
  }
}

export enum DiagnosticMessage {
  GenericUnsupportedSyntax = 'Unsupported syntax.',
  EfficiencyUnsupportedSyntax = 'Unsupported syntax. This is not supported because it would result in inefficient smart contract code',
  CouldNotInferType = 'Could not infer type. Please add an explicit type annotation.',
  CouldNotInferTypeDeopt = 'Could not infer type. Deoptimized implementation will be used. Add an explicit type annotation ',
  CouldNotInferSymbol = 'Could not infer symbol.',
  CouldNotInferSymbolDeopt = 'Could not infer symbol. Deoptimized implementation will be used.',
  CannotImplementBuiltin = 'Built-ins cannot be implemented.',
  CannotReferenceBuiltinProperty = 'Builtin properties cannot be referenced',
  CannotModifyBuiltin = 'Builtins cannot be modified',
  CannotIndexBuiltin = 'Builtin properties cannot be referenced',
  CannotReferenceBuiltin = 'Builtins cannot be referenced',
  CannotInstanceofBuiltin = 'Builtins cannot be checked with instanceof',
  InvalidSyscall = 'First argument to syscall must be a string literal corresponding to a NEO syscall.',
  DeployReserved = 'The deploy method is reserved in SmartContract instances.',
  InvalidContractEventNameStringLiteral = 'Invalid SmartContract event. Event name must be a string literal.',
  InvalidContractEventMissingType = 'Invalid SmartContract event. Argument type must be explicitly defined.',
  InvalidContractEventArgStringLiteral = 'Invalid SmartContract event. Argument must be a string literal.',
  InvalidContractEventDeclaration = 'Invalid SmartContract event. Event must be assigned to a variable.',
  InvalidContractPropertiesMissing = 'Invalid SmartContract. Properties must be defined.',
  InvalidContractPropertiesInitializer = 'Invalid SmartContract. Properties must be defined with an object literal of literal properties.',
  InvalidContractMethodMultipleSignatures = 'Invalid SmartContract method. Method must have one call signature',
  SyscallReturnTypeExplicitCast = 'Syscall return type must be explicitly casted to expected type.',
  UnknownReference = 'Unknown reference %s',
  UnknownModule = 'Unknown module %s',
  MultipleSignatures = 'Found multiple call signatures for property. Only one call signature is allowed.',
  MissingParameterDeclaration = 'Could not find param declaration for parameter %s.',
  ResolveOneType = 'Expected type to resolve to one known type',
  InvalidAddress = 'Argument to Address.from must be a string literal address.',
  InvalidHash256 = 'Argument to Hash256.from must be a string literal hash256.',
  InvalidPublicKey = 'Argument to PublicKey.from must be a string literal publicKey.',
  EventNotifierArguments = 'The arguments to createEventNotifier must be string literals.',
  InvalidBuiltinCallArgument = 'Call parameter is ambiguous in relation to the provided argument.',
  InvalidBuiltinAssignment = 'Assignment (%s => %s) is ambiguous in relation to the provided expression.',
  InvalidLinkedSmartContractDeclaration = 'Expected a valid declaration for a linked smart contract.',
  InvalidLinkedSmartContractMissing = 'Missing linked smart contract dependency %s',
  InvalidCurrentTimeOffsetNumericLiteral = 'Deploy.currentTime must have a numeric literal for the offset.',
  InvalidCurrentTimeParameterUsage = 'Deploy.currentTime may only be used as the default value for a constructor parameter.',
  InvalidSenderAddressParameterUsage = 'Deploy.senderAddress may only be used as the default value for a constructor parameter.',
}

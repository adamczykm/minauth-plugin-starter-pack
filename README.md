## Introduction

MinAuth is an authentication library that integrates with passport.js (probably more options in the future) and a framework for building "plugins" that extend and provide its authentication functionality. This architecture allows it to be highly customizable and easily malleable to one's needs given that one can either adapt an existing plugin or create one on their own.
This repository contains a 'plugin starter template' and also can be considered a 'create-your-own-minauth-plugin' guide.

## Usage

If you are not sure how to write a MinAuth plugin read this guide, the in-code documentation and check out implementations available in the main MinAuth [repository](https://github.com/mlabs-haskell/MinAuth). Then set up the template for the plugin:

```bash
git clone https://github.com/adamczykm/minauth-plugin-starter-pack
cd minauth-plugin-starter-pack
sh start.sh
npm run build
```

## A MinAuth plugin

A MinAuth plugin is minimally a typescript package that has a specific structure and implements required interfaces. Technically can be any Typescript package that contains `plugin.ts` and `prover.ts` of which default exports implement `IMinAuthPlugin` (and `IMinAuthPluginFactory`) and `IMinAuthProver` correspondingly.
A plugin (or a verifier) and prover are two distinct parts of a MinAuth plugin. Plugin is usually meant to work server-side (providing data and verifying proofs of authorization) while prover is client-side (understanding data, user input, generating and submitting proofs), and since MinAuth is mostly about connecting web3 authorization means to web2 resources we will stick to the usual web2 server-client architecture.
The two are meant to cooperate to provide seamless experience for both server-side MinAuth users and browser-side service users.

### Remarks on MinAuth plugins' safety

MinAuth has no means to ensure that 3rd party plugins are secure to use and don't leak secrets or track its users. As a MinAuth user always be sure to trust authors of plugins you use or audit their code. As a MinAuth plugin author make sure that you test your code thoroughly and understand the data and its flow involved during using your plugin. Some solutions may be prone to some  attacks even if they have not bugs per-se.

## Implementing minimal MinAuth plugin

This section will guide you through implementation of a overly simple plugin for the sake of going through all the steps necessary.
A good example of such a minimal and overly simple authentication strategy is a single password strategy where access to a resource is provided if you know certain secret string.
In the case of such a simple solution there is no need to use zero-knowledge proofs which is the main purpose behind the library, but let's use it for demonstrational purposes nevertheless. The zk-circuits will be implemented using `o1js` which is the language powering MINA contracts. MINA is the first succinct blockchain completely based on recursive zk-snarks, taking the ZKP-based decentralized applications to a new level.

### Intended plugin initialization and authentication flow

The intended interaction with the plugin are as follows

The server:
- it initializes and hosts the verifier part with a configuration being an expected ZK proof output (the hash of the secret)
	- the verifier parts compiles the zk snark circuit (in this case - program generating hash of a string and checking that it matches its secret input) to get the verification key.
- it sets up a passport.js strategy and provides the login endpoint
- it will listen for requests containing proofs matching required verification key and accept them if the proofs output matches the expected one.

The client:
- Initializes the prover part of the plugin which mean compilation of the underlying zk-snarks to get the prover keys and the verification key.
- Provides users with an input for the secret
- Passes the input into the prover to create and submit the proof.
- Receive authentication tokens from the server.

**Plugins responsibility is only to correctly implement couple of typescript interfaces.**

### IMinAuthPluginFactory interface

Any plugin's implementation - the `plugin.ts` file should export an instance of `IMinAuthPluginFactory` as a default export.
This instance will be used to instantiate plugins using configuration read from a file.
Slightly simplified version of the interface is as follows:

```typescript
export interface IMinAuthPluginFactory {

  initialize(
    cfg: Configuration,
    logger: Logger
  ): RetType<InterfaceType, ThePluginInstanceType>;

  readonly configurationDec: Decoder<InterfaceType, Configuration>;
}

```

The interface user should be able to read and parse a configuration for the plugin.
And then using parsed configuration to instantiate the plugin.

### IMinAuthPlugin interface

```typescript
export interface IMinAuthPlugin<InterfaceType extends InterfaceKind, Input, Output> extends WithInterfaceTag<InterfaceType> {
   ...
}
```

The plugin interface type has three type parameters the first of which may cause some confusion. `InterfaceType` is a type that would determine the shape of the methods provided by the interface. In MinAuth there are two supported interface types: 'idiomatic typescript interface' and 'functional interface (via fp-ts library)'. If you like functional programming and `fp-ts` go with the functional interface which will make it easier to create programs made of safer and composable abstractions, otherwise pick idiomatic typescript that will work with the usual ts types such as promises.
The second and third parameters simply determine the input and output of the plugin allowing customizations and type-safety.

The interface must implement the following methods.

#### Verifying plugin's input and producing output

```typescript
verifyAndGetOutput(input: Input): RetType<InterfaceType, Output>;
```
which in case of the typescript interface type will have a form of:
```typescript
verifyAndGetOutput(input: Input): Promise<Output>;
```
The method generates an Output out of an Input. 
An Input will generally contain a serialized zk-snark verifiable by the plugin and some data necessary to establish public inputs to the proof. 
An Output will contain data derived from the public input and public output of the proof plus identifiers necessary to be able to assess the output validity over time. 

#### Checking the output validity over time

Another method that has to be implement by any plugin is
```typescript
  checkOutputValidity(output: Output): RetType<InterfaceType, OutputValidity>;
```
This is meant to be used whenever a party using the plugin wants to check if some output is still valid, e.g. an NFT is still being held by a contract.
A plugin should be able to identify the output it has produced and decide if their validity withholds.

#### Input/Output serialization

Any plugin should provide means to encode and decode its IO data from a serialized form (input and output) and from decoded values to serialized versions (output) its done by implementing the following:

```typescript
  /** The decoder for the plugin inputs. */
  readonly inputDecoder: Decoder<InterfaceType, Input>;

  /** Encoder/Decoder for the plugins outputs. */
  readonly outputEncDec: EncodeDecoder<InterfaceType, Output>;
```

#### Custom prover-plugin routes

More complicated plugins will very often exchange some information to make the overall experience more streamlined and seamless. Plugins are expected to provide a Router object that will be used by the server to install and serve custom routes which can be used by the client-side provers.

```typescript
  readonly customRoutes: express.Router;
```


### IMinAuthProver interface

Let's now break down the interface of the prover:

```typescript
  export interface IMinAuthProver<
  InterfaceType extends InterfaceKind,
  PublicInputArgs,
  PublicInput,
  PrivateInput
> extends WithInterfaceTag<InterfaceType> {
  prove(
    publicInput: PublicInput,
    secretInput: PrivateInput
  ): RetType<InterfaceType, JsonProof>;

  fetchPublicInputs(args: PublicInputArgs): RetType<InterfaceType, PublicInput>;
}

```
The interface type is parameterized by 4 types. The `InterfaceType` denotes the same as in the plugin case. The other that may not be self-explanatory is `PublicInputArgs`. This type is meant for data necessary to acquire public inputs from the plugin. 
Often, public inputs to the proofs will be available globally from external sources such as blockchains or 3rd party APIs, but sometimes it may be convenient to provide them to users via a convenient method of the plugin's prover:
```typescript
  fetchPublicInputs(args: PublicInputArgs): RetType<InterfaceType, PublicInput>;
```

The other method is `prove`:
```typescript
  prove(
    publicInput: PublicInput,
    secretInput: PrivateInput
  ): RetType<InterfaceType, JsonProof>;
```
Which given a set of inputs is expected to provide a serialized version of a proof.
The JsonProof type comes from `o1js` library and will be generalized in the future.

### The simple plugin implementation

The implementation of the said plugin is provided in this repository along with some extended commentary.

## Remarks on more complicated plugins

Usually MinAuth plugins will be more complicated. They will either use external APIs, chain-indexer, databases and/or communicate more between plugin and prover. They may involve more parties via recursive multi-party proofs. All of this do not affect the required plugin parts substantially so has been omitted for the sake of simplicity.
Examples of more involved MinAuth plugin's can be found in the MinAuth monorepo.
In case of any doubts or questions one is encouraged to ask questions in this repository or the main MinAuth repository.

## Using the plugin

To see how the plugin can be used with express.js and passport.js consult the demo project in the main MinAuth repository [here](https://github.com/mlabs-haskell/minauth).

## Credits

The work necessary to create this project and the MinAuth library itself was mainly sponsored by MINA ZkIgnite and MINA Navigators grant programs.
Learn more about MINA here: https://minaprotocol.com/

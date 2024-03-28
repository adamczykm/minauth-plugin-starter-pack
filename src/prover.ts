import { Field, JsonProof, Cache } from 'o1js';
import {
  IMinAuthProver,
  IMinAuthProverFactory
} from 'minauth/dist/plugin/plugintype.js';
import { TsInterfaceType } from 'minauth/dist/plugin/interfacekind.js';
import { Logger } from 'minauth/dist/plugin/logger.js';
import ProvePreimageProgram from './hash-preimage-proof.js';
import { VerificationKey } from 'minauth/dist/common/verificationkey.js';
import { PluginRouter } from 'minauth/dist/plugin/pluginrouter.js';

export type Configuration = {
  logger: Logger;
};

/**
 * Somewhat trivial example of a prover.
 * The server keeps a fixed set of hashes.
 * You can prove that you have access by providing the secret
 * preimage of one of the whitelisted hashes.
 *
 * NOTE. Although you can always generate valid zkproof, its output must
 *       match the list kept by the server.
 */
export class SimpleProver
  implements IMinAuthProver<TsInterfaceType, unknown, Field, Field>
{
  /** This prover uses an idiomatic Typescript interface */
  readonly __interface_tag: 'ts';
  static readonly __interface_tag: 'ts';

  /** The prover's logger */
  protected readonly logger: Logger;

  /** The prover's plugin routes */
  protected readonly pluginRoutes: PluginRouter;

  protected constructor(logger: Logger ) {
    this.logger = logger;
  }

  /** Build a proof. */
  async prove(publicInput: Field, secretInput: Field): Promise<JsonProof> {
    this.logger.debug('Building proof started.');
    const proof = await ProvePreimageProgram.baseCase(publicInput, secretInput);
    this.logger.debug('Building proof finished.');
    return proof.toJSON();
  }

  /** Fetches a list of hashes recognized by the server. */
  async fetchPublicInputs(): Promise<Field> {
    // this plugin does not require any data to be fetched
    // we could implement an endpoint to fetch all the available
    // whitelisted hashes. It would however made it easier to
    // try to conduct a brute-force preimage search.
    throw new Error('Not available')
  }

  /** Compile the underlying zk circuit */
  static async compile(): Promise<{ verificationKey: VerificationKey }> {
    // TODO cehck if still the case
    // disable cache because of bug in o1js 0.14.1:
    // you have a verification key acquired by using cached circuit AND
    // not build a proof locally,
    // but use a serialized one - it will hang during verification.
    return await ProvePreimageProgram.compile({ cache: Cache.None });
  }

  /** Initialize the prover */
  static async initialize(
    config: Configuration,
    { compile = true } = {}
  ): Promise<SimpleProver> {
    const { logger } = config;
    logger.info('SimpleProver.initialize');
    if (compile) {
      logger.info('compiling the circuit');
      await SimpleProver.compile();
      logger.info('compiled');
    }
    return new SimpleProver(logger);
  }
}

SimpleProver satisfies IMinAuthProverFactory<
  TsInterfaceType,
  SimpleProver,
  unknown
>;

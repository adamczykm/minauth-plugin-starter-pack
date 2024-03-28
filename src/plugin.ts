import { Cache, verify } from "o1js";
import {
  IMinAuthPlugin,
  IMinAuthPluginFactory,
  OutputValidity,
  outputInvalid,
  outputValid,
} from "minauth/dist/plugin/plugintype.js";
// import zk program used to create proofs and verify proofs
import ProvePreimageProgram from "./hash-preimage-proof.js";
import { z } from "zod";
import { TsInterfaceType } from "minauth/dist/plugin/interfacekind.js";
import {
  wrapZodDec,
  combineEncDec,
  noOpEncoder,
} from "minauth/dist/plugin/encodedecoder.js";
import { Logger } from "minauth/dist/plugin/logger.js";
import { VerificationKey } from "minauth/dist/common/verificationkey.js";
import { JsonProofSchema } from "minauth/dist/common/proof.js";
import { Router } from "express";

/**
 * The plugin configuration schema.
 */
export const hashWhitelistSchema = z.record(
  /** Hash of the 'password'
  z.string(),
  /** An auxilliary name for the hash */
  z.string(),
);

/**
 * Automatically infer the type of the configuration
 * based on the schema.
 */
export type Configuration = z.infer<typeof hashWhitelistSchema>;

/**
 * The input is just a proof. */
export const InputSchema = z.object({
  proof: JsonProofSchema,
});

export type Input = z.infer<typeof InputSchema>;

/**
 * The output of the plugin is the hash that *was proven*
 * and the tag associated with it.
 */
export type Output = {
  provedHash: string;
  tag: string;
};

/**
 * Somewhat trivial example of a plugin.
 * The plugin keeps a fixed set of hashes.
 * Each hash is associated with a role in the system.
 * One can prove that they know a hash and therefore
 * get access based on the unlocked tag.
 *
 * NOTE. Although one can always generate valid zkproof its
 *       public input must match the list kept by the server.
 */
export class SimplePlugin
  implements IMinAuthPlugin<TsInterfaceType, Input, Output>
{
  /**
   * This plugin uses an idiomatic Typescript interface
   */
  readonly __interface_tag = "ts";

  /**
   * Verify a proof and return the role.
   */
  async verifyAndGetOutput(inp: Input): Promise<Output> {
    this.logger.debug("entering verifyAndGetOutput");

    // Extract the hash from the proof's public input
    const provedHash = inp.proof.publicInput.toString();
    const tag = this.hashWhitelist[provedHash];

    // Only allow hashes that are in the whitelist
    if (tag === undefined) {
      throw new Error("Provided hash is not in the whitelist.");
    }

    this.logger.debug("Proof verification...");
    // Verify the proof: someone creating the proof must have known the
    // secret input that hashes to the public input.
    const valid = await verify(inp.proof, this.verificationKey.data);
    if (!valid) {
      this.logger.info("Proof verification failed.");
      throw new Error("Invalid proof!");
    }
    this.logger.info("Proof verification succeeded.");

    return { provedHash, tag };
  }

  /**
   * Check if produced output is still valid. If the whitelist was edited
   * it may become invalid. Notice that the proof and output consumer must not
   * allow  output forgery as this will accept forged outputs without verification.
   * To prevent it the plugin could take the reponsibility by having a cache of outputs
   * with unique identifiers.
   * In case of the output being signed by the server in JWT payload
   * the verification of the signature would be enough.
   */
  async checkOutputValidity(output: Output): Promise<OutputValidity> {
    this.logger.debug("Checking validity of ", output);

    // If the hash is not in the whitelist, the output is invalid
    if (!(output.provedHash in this.hashWhitelist)) {
      this.logger.debug("Hash not in the whitelist");
      return Promise.resolve(outputInvalid("Hash not in the whitelist"));
    }

    this.logger.debug("Output is valid");
    return Promise.resolve(outputValid);
  }

  /**
   * This ctor is meant ot be called by the `initialize` function.
   */
  constructor(
    /**
     *  A memoized zk-circuit verification key
     *  This will be needed to call `verify` function on the proof.
     */
    readonly verificationKey: VerificationKey,

    /**
     *  The mapping between hashes and some tag.
     *  If the hash is in the whitelist, one can
     *  get verified by proving that they know the preimage.
     */
    private hashWhitelist: Record<string, string>,

    /** It is a good idea to log the plugin's activity */
    private readonly logger: Logger,
  ) {}

  static readonly __interface_tag = "ts";

  /**
   * Initialize the plugin with a configuration.
   */
  static async initialize(
    configuration: Configuration,
    logger: Logger,
  ): Promise<SimplePlugin> {
    const { verificationKey } = await ProvePreimageProgram.compile({
      cache: Cache.None,
    });

    return new SimplePlugin(verificationKey, configuration, logger);
  }

  static readonly configurationDec = wrapZodDec("ts", hashWhitelistSchema);

  /** The plugin needs to provide a way to
      deserialize its inputs */
  readonly inputDecoder = wrapZodDec(
    "ts",
    z.object({ proof: JsonProofSchema }),
  );

  /** The plugin needs to provide a way to serialize
      and deserialize its outputs */
  readonly outputEncDec = combineEncDec(
    noOpEncoder("ts"),
    wrapZodDec("ts", z.object({ provedHash: z.string(), tag: z.string() })),
  );

  /** The interface requires the plugin to provide custom routes router
      but it can be left empty. */
  readonly customRoutes = Router();
}

// sanity check
SimplePlugin satisfies IMinAuthPluginFactory<
  TsInterfaceType,
  SimplePlugin,
  Configuration
>;

export default SimplePlugin;

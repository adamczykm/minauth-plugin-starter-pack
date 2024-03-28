import { Logger, ILogObj } from 'tslog';
import { describe, expect, test } from '@jest/globals';
import { Field, Poseidon } from 'o1js';
import SimplePlugin, { Configuration } from '../src/plugin.js';
import {SimpleProver} from '../src/prover.js';

const log = new Logger<ILogObj>({
  name: 'Simple plugin zk-program test suite'
});
const pluginLog = log.getSubLogger({ name: 'SimplePlugin' });
const proverLog = log.getSubLogger({ name: 'SimpleProver' });

/**
   Always remember to test your zk program logic thoroughly.
 */
describe('SimplePlugin test suite', () => {

  const config: Configuration = {
    [Poseidon.hash([new Field(1)]).toString()]: '1',
    [Poseidon.hash([new Field(2)]).toString()]: '2',
  }

  test('The plugin should instantiate correctly via the factory interface', async () => {
    const plugin = await SimplePlugin.initialize(
      config,
      pluginLog
    );
    expect(plugin).toBeDefined();
  }, 30000);

  test('The prover should instantiate correctly via the factory interface', async () => {
    const prover = await SimpleProver.initialize(
      { logger: proverLog }
    );
    expect(prover).toBeDefined();
  }, 30000);


  test('The prover should be able to create a valid proof that gets accepted', async () => {
    const prover = await SimpleProver.initialize(
      { logger: proverLog }
    );

    const s1 = new Field(1);
    const h1 = Poseidon.hash([s1]);

    const s2 = new Field(2);
    const h2 = Poseidon.hash([s2]);

    const proof = await prover.prove(h1, s1);

    const plugin = await SimplePlugin.initialize(
      config,
      pluginLog
    );
    const output = await plugin.verifyAndGetOutput({proof});
    expect(output).toEqual({provedHash: h1.toString(), tag: "1"});
    const proof2 = await prover.prove(h2, s2);
    const output2 = await plugin.verifyAndGetOutput({proof: proof2});
    expect(output2).toEqual({provedHash: h2.toString(), tag: "2"});
  }, 30000);

  /** Test all the cases where the plugin should not accept the input */
  test('The plugin should rejects hashes that are not in the whitelist', async () => {
    log.debug('');
  }, 30000);

  test('The plugin should rejects invalid proofs', async () => {
  }, 30000);


  /** Test the validation of the plugin output */

  test('The plugin output should be valid immediately after its generation', async () => {
  }, 30000);

  test("The plugin output should be invalid when plugin's configuration is changed", async () => {
  }, 30000);

  /** Test the plugin's input, configuration and output decoders */

  /// Test the input decoder

  /// Test the output encdecoder

  /// Test the configuration decoder


});

import { Logger, ILogObj } from 'tslog';
import { describe, expect, test } from '@jest/globals';
import ProvePreimageProgram, {ProvePreimageProofClass} from '../src/hash-preimage-proof.js'
import { Field, Poseidon, verify } from 'o1js';

const log = new Logger<ILogObj>({
  name: 'Simple plugin zk-program test suite'
});

/**
   Always remember to test your zk program logic thoroughly.
 */
describe('Plugin zk-program test suite', () => {

  test('zk-circuit should compile and return verification key', async () => {
    const { verificationKey } = await ProvePreimageProgram.compile();
    log.debug('verification key', verificationKey.data.slice(0, 10) + '..');
    expect(verificationKey).toBeDefined();
  }, 30000);

  test('one can create, serialize and deserialize a valid proof', async () => {

    const secret = new Field(123);
    const hash = Poseidon.hash([secret]);

    const proof = await ProvePreimageProgram.baseCase(hash, secret)

    const jsonProof = proof.toJSON();
    log.debug(
      'json proof',
      JSON.stringify({
        ...jsonProof,
        proof: jsonProof.proof.slice(0, 10) + '..',
      })
    );

    const deserializedProof = ProvePreimageProofClass.fromJSON(jsonProof);

    expect(deserializedProof).toBeDefined();
  }, 30000);

  // try to test all the cases where the program should fail
  test('one can not create an invalid proof', async () => {

    const secret = new Field(123);
    const hash = secret

    expect(async () => {
      await ProvePreimageProgram.baseCase(hash, secret)
    }).rejects.toThrow();
  }, 30000);

  test('valid proof should verify with no issues', async () => {

    const secret = new Field(123);
    const hash = Poseidon.hash([secret]);

    const { verificationKey } = await ProvePreimageProgram.compile();
    const proof = await ProvePreimageProgram.baseCase(hash, secret)

    const ret = await verify(proof, verificationKey);

    expect(ret).toBeTruthy();

  }, 30000);

  test('invalid proof should not verify', async () => {

    const secret = new Field(123);
    const hash = Poseidon.hash([secret]);

    const { verificationKey } = await ProvePreimageProgram.compile();
    const proof = await ProvePreimageProgram.baseCase(hash, secret)

    proof.publicInput = Field(0);

    const ret = await verify(proof, verificationKey);

    expect(ret).toBeFalsy();

  }, 30000);


});

import { Field, ZkProgram, Poseidon } from 'o1js';

/** This very simple zk-program will just check if the public input
    is the hash of the secret input. */
export const ProvePreimageProgram = ZkProgram({
  name: 'ProvePreimage',
  publicInput: Field,

  methods: {
    baseCase: {
      privateInputs: [Field],
      method(publicInput: Field, secretInput: Field) {
        Poseidon.hash([secretInput]).assertEquals(publicInput);
      }
    }
  }
});

export const ProvePreimageProofClass = ZkProgram.Proof(ProvePreimageProgram);

export default ProvePreimageProgram;

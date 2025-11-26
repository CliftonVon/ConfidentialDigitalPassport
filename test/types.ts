import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export type Signers = {
  deployer: HardhatEthersSigner;
  authority: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
  verifier: HardhatEthersSigner;
  malicious: HardhatEthersSigner;
};

export const SAMPLE_TEST_DATA = {
  AGE: 25,
  NATIONAL_ID: 123456789n,
  CITIZENSHIP_CODE: 840, // USA country code
  NAME: "encrypted_name_data",
  COUNTRY: "encrypted_country_data",
  DEFAULT_VALIDITY: 10, // 10 years
} as const;

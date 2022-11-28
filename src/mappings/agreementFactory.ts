import { Agreement } from "../../generated/templates";
import {
  AgreementCreated,
  AgreementImplementationChanged,
  OwnershipTransferred,
} from "../../generated/AgreementFactory/AgreementFactory";
import * as Schema from "../../generated/schema";
import { networkName } from "../constants";

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let ownerChanged = new Schema.AgreementFactoryOwnerChanged(
    `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
  );
  ownerChanged.contract = event.address;
  ownerChanged.timestamp = event.block.timestamp;
  ownerChanged.blockHash = event.block.hash;
  ownerChanged.network = networkName;
  ownerChanged.blockNumber = event.block.number;
  ownerChanged.transactionHash = event.transaction.hash;
  ownerChanged.logIndex = event.logIndex;
  ownerChanged.owner = event.params.newOwner;
  ownerChanged.save();
}

export function handleAgreementImplementationChanged(
  event: AgreementImplementationChanged
): void {
  let agreementImplementationChanged = new Schema.AgreementImplementationChanged(
    `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
  );
  agreementImplementationChanged.contract = event.address;
  agreementImplementationChanged.network = networkName;
  agreementImplementationChanged.timestamp = event.block.timestamp;
  agreementImplementationChanged.blockHash = event.block.hash;
  agreementImplementationChanged.blockNumber = event.block.number;
  agreementImplementationChanged.transactionHash = event.transaction.hash;
  agreementImplementationChanged.logIndex = event.logIndex;
  agreementImplementationChanged.agreementImplementation =
    event.params.agreementImplementation;
  agreementImplementationChanged.save();
}

export function handleAgreementCreated(event: AgreementCreated): void {
  let agreementCreated = new Schema.AgreementCreated(
    `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
  );
  agreementCreated.contract = event.address;
  agreementCreated.timestamp = event.block.timestamp;
  agreementCreated.blockHash = event.block.hash;
  agreementCreated.network = networkName;
  agreementCreated.blockNumber = event.block.number;
  agreementCreated.transactionHash = event.transaction.hash;
  agreementCreated.logIndex = event.logIndex;
  agreementCreated.agreementAddress = event.params.agreementAddress;
  agreementCreated.fromVersion = "10"
  agreementCreated.agreementImplementation =
    event.params.agreementImplementation;
  agreementCreated.save();

  let agreement = new Schema.Agreement(
    event.params.agreementAddress.toHex()
  );
  agreement.address = event.params.agreementAddress;
  agreement.network = networkName;
  agreement.contract = event.address;
  agreement.implementationAddress = event.params.agreementImplementation;
  agreement.fromVersion = "10";
  agreement.dataHash = ''
  agreement.timestamp = event.block.timestamp
  agreement.creationTxHash = event.transaction.hash
  agreement.save();
  Agreement.create(event.params.agreementAddress);
}

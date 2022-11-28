import {
  AddedToWhitelist,
  LendingContract,
  LoanCreated,
  LoanIncreased,
  RemovedFromWhitelist,
  Repayment,
} from "../../generated/LendingContract/LendingContract";
import * as Schema from "../../generated/schema";
import { networkName } from "../constants";
import { ethereum } from "@graphprotocol/graph-ts";
import { insertPushNotification } from "./pushNotification";

export function handleAddedToWhitelist(event: AddedToWhitelist): void {
  let whitelist = Schema.Whitelist.load(event.address.toHex());
  if (!whitelist) {
    whitelist = new Schema.Whitelist(event.address.toHex());
    whitelist.network = networkName;
  }
  let whitelistMembers = whitelist.members;
  whitelistMembers.push(event.params.account);
  whitelist.members = whitelistMembers;
  whitelist.save();
}

export function handleRemovedFromWhitelist(event: RemovedFromWhitelist): void {
  let whitelist = Schema.Whitelist.load(event.address.toHex());
  if (whitelist) {
    let whitelistMembers = whitelist.members;
    for (let i = 0; i < whitelist.members.length; i++) {
      if (whitelist.members[i] == event.params.account) {
        whitelistMembers.splice(i, 1);
      }
    }
    whitelist.members = whitelistMembers;
    whitelist.save();
  }
}

export function handleLoanCreated(event: LoanCreated): void {
  let agreement = Schema.Agreement.load(event.params.agreements[0].toHex());
  let contract = LendingContract.bind(event.address)
  let loanData = contract.try_loans(event.params.id)
  if (!agreement || loanData.reverted) {
    return
  } else {
    const lender = loanData.value.value0
    const borrower = loanData.value.value1
    let loan = new Schema.Loan(event.params.id.toString());
    loan.agreement = agreement.id;
    loan.network = networkName;
    loan.lender = lender
    loan.borrower = borrower
    loan.save();
  
    let loanCreated = new Schema.LoanCreated(event.params.id.toString());
    loanCreated.contract = event.address;
    loanCreated.network = networkName;
    loanCreated.agreement = agreement.id;
    loanCreated.timestamp = event.block.timestamp;
    loanCreated.blockHash = event.block.hash;
    loanCreated.blockNumber = event.block.number;
    loanCreated.transactionHash = event.transaction.hash;
    loanCreated.logIndex = event.logIndex;
    loanCreated.lender = lender
    loanCreated.borrower = borrower
    loanCreated.save();
  }

  const encoded = ethereum.encode(ethereum.Value.fromString(event.params.id.toString()))!;
  insertPushNotification(event, "LoanCreated(uint256,address[])", encoded);
}

export function handleLoanIncreased(event: LoanIncreased): void {
  let loanIncreased = new Schema.LoanIncreased(
    `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
  );
  loanIncreased.amount = event.params.amount;
  loanIncreased.network = networkName;
  loanIncreased.loanId = event.params.id;
  let loan = Schema.Loan.load(event.params.id.toString());
  if (loan) {
    let increasings = loan.loanIncreasings;
    increasings.push(loanIncreased.id);
    loan.loanIncreasings = increasings;
    loan.save();
  }
  loanIncreased.save();
}

export function handleRepayment(event: Repayment): void {
  let loan = Schema.Loan.load(event.params.id.toString());
  if (loan) {
    let repayment = new Schema.Repayment(
      `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
    );
    repayment.amount = event.params.amount;
    repayment.network = networkName;
    repayment.loanId = event.params.id;
    repayment.contract = event.address;
    repayment.timestamp = event.block.timestamp;
    repayment.blockHash = event.block.hash;
    repayment.blockNumber = event.block.number;
    repayment.transactionHash = event.transaction.hash;
    repayment.logIndex = event.logIndex;
    repayment.from = event.transaction.from;
    repayment.lender = loan.lender
    repayment.borrower = loan.borrower

    let repayments = loan.repayments;
    repayments.push(repayment.id);
    loan.repayments = repayments;
    loan.save();

    repayment.agreement = loan.agreement
    repayment.save();
  }

  const id = ethereum.Value.fromUnsignedBigInt(event.params.id);
  const amount = ethereum.Value.fromUnsignedBigInt(event.params.amount);
  const fixedSizedArray = ethereum.Value.fromFixedSizedArray([
    id,
    amount,
  ]);
  const tupleArray: Array<ethereum.Value> = [
    fixedSizedArray,
  ];
  const tuple = changetype<ethereum.Tuple>(tupleArray);
  const encoded = ethereum.encode(ethereum.Value.fromTuple(tuple))!;

  insertPushNotification(event, "Repayment(uint256,uint256)", encoded);
}
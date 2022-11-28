import * as Yaml from "js-yaml";
import * as fs from "fs";

async function main() {
  const NETWORK: string = process.env.NETWORK || "";
  let implementationAddresses: string[] = [];

  if (fs.existsSync("./subgraph.yaml")) {
    fs.unlinkSync("./subgraph.yaml");
  }

  if (fs.existsSync("./src/constants.ts")) {
    fs.unlinkSync("./src/constants.ts");
  }

  let templateFile: any = Yaml.load(
    fs.readFileSync("./subgraph.template.yaml", "utf8")
  );

  const configFile: any = Yaml.load(
    fs.readFileSync("./chains.config.yaml", "utf8")
  );

  const config = configFile.networks.find(
    (network: any) => network.name == NETWORK
  );

  templateFile.templates.forEach((template: any) => {
    if (NETWORK === "polygon") {
      template.network = "matic";
    } else {
      template.network = NETWORK;
    }
  });

  templateFile.dataSources.forEach((dataSource: any) => {
    dataSource.source.startBlock = config.startBlock;
    if (NETWORK === "polygon") {
      dataSource.network = "matic";
    } else {
      dataSource.network = NETWORK;
    }

    switch (dataSource.name) {
      case "LendingContract":
        dataSource.source.address = config.LendingContract;
        break;
      case "TrackedToken":
        dataSource.source.address = config.TrackedToken;
        break;
      case "AgreementFactory":
        dataSource.source.address = config.AgreementFactoryV10;
        break;
      default:
        break;
    }
  });

  implementationAddresses.push(config.agreementImplementationV10);

  let addressesString = "";
  implementationAddresses.forEach((address) => {
    addressesString += `"${address.toLocaleLowerCase()}", `;
  });
  const implementationAddressesString = `
  export const addresses = [
    ${addressesString}
  ];
  export const networkName = "${NETWORK}"`;

  const newSubgraphFile = Yaml.dump(templateFile);
  fs.writeFileSync("./subgraph.yaml", newSubgraphFile, "utf8");
  fs.writeFileSync("./src/constants.ts", implementationAddressesString, "utf8");
}

main();

# Original Works Subgraph
&nbsp;
&nbsp;
## Setup

1. Install dependencies:

    ```
    $ yarn install
    ```

2. Load config for a specific chain (ropsten / kovan / goerli/ ownet / mumbai / binance):

    ```
    $ yarn load-config:<chain>
    ```

3. Generate types:

    ```
    $ yarn codegen
    ```
&nbsp;
&nbsp;
## Deploy

1. Authorize:

    ```
    graph auth --product hosted-service <ACCESS_TOKEN>
    ```

2. Deploy 
    <br />
    ### To hosted service (kovan / ropsten / goerli / mumbai / binance):

    ```
    graph deploy --product hosted-service cezary-stroczynski/ropstendev-v2
    ```
    ```
    graph deploy --product hosted-service cezary-stroczynski/goerlidev-v2
    ```
    ```
    graph deploy --product hosted-service cezary-stroczynski/kovanstage
    ```
    ```
    graph deploy --product hosted-service cezary-stroczynski/mumbaistage
    ```
    ```
    graph deploy --product hosted-service cezary-stroczynski/binanceprod
    ```
    &nbsp;
    &nbsp;
    ### To private AWS service (ownet):

    ```
    graph deploy --node https://graph-node-admin.original.works --ipfs https://ipfs.original.works original-works/ownet
    ```
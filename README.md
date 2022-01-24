# constant-sum automated market maker
proof-of-concept of a constant-sum AMM, aka a liquidity pool where the relation between its assets is determined by the following invariant:
```
x + y = k
```
## Run unit/integration tests
```
yarn install
yarn test
```
## Run Echidna fuzzing tests
```
docker pull trailofbits/eth-security-toolbox
docker run -it -v "$PWD":/home/training trailofbits/eth-security-toolbox
solc-select 0.8.10
cd /home/training
echidna-test . --contract EchidnaCSAmm --config config.yaml
```

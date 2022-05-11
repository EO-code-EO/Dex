import { BigNumber, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import styles from "../styles/Home.module.css";
import { addLiquidity, calculateDH } from "../utils/addLiquidity";
import {
  getDHTokensBalance,
  getEtherBalance,
  getLPTokensBalance,
  getReserveOfDHTokens,
} from "../utils/getAmounts";
import {
  getTokensAfterRemove,
  removeLiquidity,
} from "../utils/removeLiquidity";
import Navbar from '../components/navbar';

export default function Liquidity() {
    /** General state variables */
    // loading is set to true when the transaction is mining and set to false when
    // the transaction has mined
    const [loading, setLoading] = useState(false);
    // This variable is the `0` number in form of a BigNumber
    const zero = BigNumber.from(0);
    /** Variables to keep track of amount */
    // `ethBalance` keeps track of the amount of Eth held by the user's account
    const [ethBalance, setEtherBalance] = useState(zero);
    // `reservedDH` keeps track of the Diamond Hands tokens Reserve balance in the Exchange contract
    const [reservedDH, setReservedDH] = useState(zero);
    // Keeps track of the ether balance in the contract
    const [etherBalanceContract, setEtherBalanceContract] = useState(zero);
    // dhBalance is the amount of `DH` tokens help by the users account
    const [dhBalance, setDHBalance] = useState(zero);
    // `lpBalance` is the amount of LP tokens held by the users account
    // `lpBalance` is the amount of LP tokens held by the users account
    const [lpBalance, setLPBalance] = useState(zero);
    /** Variables to keep track of liquidity to be added or removed */
    // addEther is the amount of Ether that the user wants to add to the liquidity
    const [addEther, setAddEther] = useState(zero);
    // addDHTokens keeps track of the amount of DH tokens that the user wants to add to the liquidity
    // in case when there is no initial liquidity and after liquidity gets added it keeps track of the
    // DH tokens that the user can add given a certain amount of ether
    const [addDHTokens, setAddDHTokens] = useState(zero);
    // removeEther is the amount of `Ether` that would be sent back to the user based on a certain number of `LP` tokens
    const [removeEther, setRemoveEther] = useState(zero);
    // removeDH is the amount of `Diamond Hands` tokens that would be sent back to the user base on a certain number of `LP` tokens
    // that he wants to withdraw
    const [removeDH, setRemoveDH] = useState(zero);
    // amount of LP tokens that the user wants to remove from liquidity
    const [removeLPTokens, setRemoveLPTokens] = useState("0");
    /** Wallet connection */
    // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
    const web3ModalRef = useRef();
    // walletConnected keep track of whether the user's wallet is connected or not
    const [walletConnected, setWalletConnected] = useState(false);

    /**
     * getAmounts call various functions to retrive amounts for ethbalance,
     * LP tokens etc
     */
    const getAmounts = async () => {
        try {
        const provider = await getProviderOrSigner(false);
        const signer = await getProviderOrSigner(true);
        const address = await signer.getAddress();
        // get the amount of eth in the user's account
        const _ethBalance = await getEtherBalance(provider, address);
        // get the amount of `Diamond Hands` tokens held by the user
        const _dhBalance = await getDHTokensBalance(provider, address);
        // get the amount of `Diamond Hands` LP tokens held by the user
        const _lpBalance = await getLPTokensBalance(provider, address);
        // gets the amount of `DH` tokens that are present in the reserve of the `Exchange contract`
        const _reservedDH = await getReserveOfDHTokens(provider);
        // Get the ether reserves in the contract
        const _ethBalanceContract = await getEtherBalance(provider, null, true);
        setEtherBalance(_ethBalance);
        setDHBalance(_dhBalance);
        setLPBalance(_lpBalance);
        setReservedDH(_reservedDH);
        //setReservedDH(_reservedDH);
        setEtherBalanceContract(_ethBalanceContract);
        } catch (err) {
        console.error(err);
        }
    };

      /**** ADD LIQUIDITY FUNCTIONS ****/

    /**
     * _addLiquidity helps add liquidity to the exchange,
     * If the user is adding initial liquidity, user decides the ether and DH tokens he wants to add
     * to the exchange. If we he adding the liquidity after the initial liquidity has already been added
     * then we calculate the Diamond Hands tokens he can add, given the eth he wants to add by keeping the ratios
     * constant
     */
    const _addLiquidity = async () => {
        try {
        // Convert the ether amount entered by the user to Bignumber
        const addEtherWei = utils.parseEther(addEther.toString());
        // Check if the values are zero
        if (!addDHTokens.eq(zero) && !addEtherWei.eq(zero)) {
            const signer = await getProviderOrSigner(true);
            setLoading(true);
            // call the addLiquidity function from the utils folder
            await addLiquidity(signer, addDHTokens, addEtherWei);
            setLoading(false);
            // Reinitialize the DH tokens
            setAddDHTokens(zero);
            // Get amounts for all values after the liquidity has been added
            await getAmounts();
        } else {
            setAddDHTokens(zero);
        }
        } catch (err) {
        console.error(err);
        setLoading(false);
        setAddDHTokens(zero);
        }
    };

    /**** END ****/

    /**** REMOVE LIQUIDITY FUNCTIONS ****/

    /**
     * _removeLiquidity: Removes the `removeLPTokensWei` amount of LP tokens from
     * liquidity and also the calculated amount of `ether` and `DH` tokens
     */
    const _removeLiquidity = async () => {
        try {
        const signer = await getProviderOrSigner(true);
        // Convert the LP tokens entered by the user to a BigNumber
        const removeLPTokensWei = utils.parseEther(removeLPTokens);
        setLoading(true);
        // Call the removeLiquidity function from the `utils` folder
        await removeLiquidity(signer, removeLPTokensWei);
        setLoading(false);
        await getAmounts();
        setRemoveDH(zero);
        setRemoveEther(zero);
        } catch (err) {
        console.error(err);
        setLoading(false);
        setRemoveDH(zero);
        setRemoveEther(zero);
        }
    };

    /**
     * _getTokensAfterRemove: Calculates the amount of `Ether` and `DH` tokens
     * that would be returned back to user after he removes `removeLPTokenWei` amount
     * of LP tokens from the contract
     */
    const _getTokensAfterRemove = async (_removeLPTokens) => {
        try {
        const provider = await getProviderOrSigner();
        // Convert the LP tokens entered by the user to a BigNumber
        const removeLPTokenWei = utils.parseEther(_removeLPTokens);
        // Get the Eth reserves within the exchange contract
        const _ethBalance = await getEtherBalance(provider, null, true);
        // get the Diamond Hands token reserves from the contract
        const diamondHandsTokenReserve = await getReserveOfDHTokens(provider);
        // call the getTokensAfterRemove from the utils folder
        const { _removeEther, _removeDH } = await getTokensAfterRemove(
            provider,
            removeLPTokenWei,
            _ethBalance,
            diamondHandsTokenReserve
        );
        setRemoveEther(_removeEther);
        setRemoveDH(_removeDH);
        } catch (err) {
        console.error(err);
        }
    };

    /**** END ****/

    /*
        connectWallet: Connects the MetaMask wallet
    */
    const connectWallet = async () => {
        try {
        // Get the provider from web3Modal, which in our case is MetaMask
        // When used for the first time, it prompts the user to connect their wallet
        await getProviderOrSigner();
        setWalletConnected(true);
        } catch (err) {
        console.error(err);
        }
    };

    /**
     * Returns a Provider or Signer object representing the Ethereum RPC with or
     * without the signing capabilities of metamask attached
     *
     * A `Provider` is needed to interact with the blockchain - reading
     * transactions, reading balances, reading state, etc.
     *
     * A `Signer` is a special type of Provider used in case a `write` transaction
     * needs to be made to the blockchain, which involves the connected account
     * needing to make a digital signature to authorize the transaction being
     * sent. Metamask exposes a Signer API to allow your website to request
     * signatures from the user using Signer functions.
     *
     * @param {*} needSigner - True if you need the signer, default false
     * otherwise
     */
    const getProviderOrSigner = async (needSigner = false) => {
        // Connect to Metamask
        // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
        const provider = await web3ModalRef.current.connect();
        const web3Provider = new providers.Web3Provider(provider);

        // If user is not connected to the Rinkeby network, let them know and throw an error
        const { chainId } = await web3Provider.getNetwork();
        if (chainId !== 4) {
        window.alert("Change the network to Rinkeby");
        throw new Error("Change network to Rinkeby");
        }

        if (needSigner) {
        const signer = web3Provider.getSigner();
        return signer;
        }
        return web3Provider;
    };

    // useEffects are used to react to changes in state of the website
    // The array at the end of function call represents what state changes will trigger this effect
    // In this case, whenever the value of `walletConnected` changes - this effect will be called
    useEffect(() => {
        // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
        if (!walletConnected) {
        // Assign the Web3Modal class to the reference object by setting it's `current` value
        // The `current` value is persisted throughout as long as this page is open
        web3ModalRef.current = new Web3Modal({
            network: "rinkeby",
            providerOptions: {},
            disableInjectedProvider: false,
        });
        connectWallet();
        getAmounts();
        }
    }, [walletConnected]);

    const renderLiquidity = () => {
        // If wallet is not connected, return a button which allows them to connect their wllet
        if (!walletConnected) {
        return (
            <button onClick={connectWallet} className={styles.button}>
                Connect your wallet
            </button>
        );
        }

        // If we are currently waiting for something, return a loading button
        if (loading) {
        return <button className={styles.button}>Loading...</button>;
        }

        return (
            <div>
            <div className={styles.description}>
                You have:
                <br/>
                <br />
                {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
                {utils.formatEther(dhBalance)} Diamond Hands Tokens
                <br />
                {utils.formatEther(ethBalance)} Ether
                <br />
                {utils.formatEther(lpBalance)} Diamond Hands LP tokens
            </div>
            <div>
                {/* If reserved DH is zero, render the state for liquidity zero where we ask the user
                how much initial liquidity he wants to add, else just render the state where liquidity is not zero and
                we calculate based on the `Eth` amount specified by the user how much `DH` tokens can be added */}
                {utils.parseEther(reservedDH.toString()).eq(zero) ? (
                <div>
                    <input
                    type="number"
                    placeholder="Amount of Ether"
                    onChange={(e) => setAddEther(e.target.value || "0")}
                    className={styles.input}
                    />
                    <input
                    type="number"
                    placeholder="Amount of Diamond Hands"
                    onChange={(e) =>
                        setAddDHTokens(
                            BigNumber.from(utils.parseEther(e.target.value || "0"))
                        )
                    }
                    className={styles.input}
                    />
                    <button className={styles.button1} onClick={_addLiquidity}>
                        Add
                    </button>
                </div>
                ) : (
                <div>
                    <input
                    type="number"
                    placeholder="Amount of Ether"
                    onChange={async (e) => {
                        setAddEther(e.target.value || "0");
                        // calculate the number of DH tokens that
                        // can be added given  `e.target.value` amount of Eth
                        const _addDHTokens = await calculateDH(
                        e.target.value || "0",
                        etherBalanceContract,
                        reservedDH
                        );
                        setAddDHTokens(_addDHTokens);
                    }}
                    className={styles.input}
                    />
                    <div className={styles.inputDiv}>
                    {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
                    {`You will need ${utils.formatEther(addDHTokens)} Diamond Hands
                    Tokens`}
                    </div>
                    <button className={styles.button1} onClick={_addLiquidity}>
                        Add
                    </button>
                </div>
                )}
                <div>
                <input
                    type="number"
                    placeholder="Amount of LP Tokens"
                    onChange={async (e) => {
                    setRemoveLPTokens(e.target.value || "0");
                    // Calculate the amount of Ether and DH tokens that the user would recieve
                    // After he removes `e.target.value` amount of `LP` tokens
                    await _getTokensAfterRemove(e.target.value || "0");
                    }}
                    className={styles.input}
                />
                <div className={styles.inputDiv}>
                    {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
                    {`You will receive ${utils.formatEther(removeDH)} Diamond
                    Hands Tokens and ${utils.formatEther(removeEther)} Eth`}
                </div>
                <button className={styles.button1} onClick={_removeLiquidity}>
                    Remove
                </button>
                </div>
            </div>
            </div>
        );
    };
    

    return (
        <div>
            <Head>
                <title>Diamond Hands | Liquidity</title>
                <meta name="keywords" content="DeFi dApp"/>
            </Head>
            <Navbar/>
                <div className={styles.main}>
                    <div>
                    <h1 className={styles.title}>Diamond Hands Liquidity</h1>
                    {renderLiquidity()}
                    </div>
                    <div>
                    <img className={styles.image} src="./diamondhands.svg" />
                    </div>
                </div>

                <footer className={styles.footer}>
                    Made with Diamond Hands &#9830;
                </footer>
        </div>
    );
}
import { Contract } from "ethers";
import {
    EXCHANGE_CONTRACT_ABI,
    EXCHANGE_CONTRACT_ADDRESS,
    TOKEN_CONTRACT_ABI,
    TOKEN_CONTRACT_ADDRESS
} from "../constants";

/** 
 * getEtherBalance: retrieves the ether balance of the user of the contract
 */
export const getEtherBalance = async (provider, address, contract = false) => {
    try {
        // if the caller has set the 'contract' boolean to true, retrieve the
        // balance of ether in the 'exchange contract', if it is set to false,
        // retrieve the balance of the user's address
        if (contract) {
            const balance = await provider.getBalance(EXCHANGE_CONTRACT_ADDRESS);
            return balance;
        } else {
            const balance = await provider.getBalance(address);
            return balance;
        }
    } catch (err) {
        console.error(err);
        return 0;
    }
};

/**
 * getDHTokensBalance: Retrieves the Diamond Hands tokens in the account of 
 * the provided 'address'
 */
export const getDHTokensBalance = async (provider, address) => {
    try {
        const tokenContract = new Contract(
            TOKEN_CONTRACT_ADDRESS,
            TOKEN_CONTRACT_ABI,
            provider
        );
        const balanceOfDiamondHandsTokens = await tokenContract.balanceOf(address);
        return balanceOfDiamondHandsTokens;
    } catch (err) {
        console.error(err);
    }
};

/**
 * getLPTokensBalance: Retrieves the amount of LP tokens in the account of the
 * provided 'address'
 */
export const getLPTokensBalance = async (provider, address) => {
    try {
        const exchangeContract = new Contract(
            EXCHANGE_CONTRACT_ADDRESS,
            EXCHANGE_CONTRACT_ABI,
            provider
        );
        const balanceOfLPTokens = await exchangeContract.balanceOf(address);
        return balanceOfLPTokens;
    } catch (err) {
        console.error(err);
    }
};

/**
 * getReserveOfDHTokens: Retrieves the amount of DH tokens in the exchange
 * contract address
 */
export const getReserveOfDHTokens = async (provider) => {
    try {
        const exchangeContract = new Contract(
            EXCHANGE_CONTRACT_ADDRESS,
            EXCHANGE_CONTRACT_ABI,
            provider
        );
        const reserve = await exchangeContract.getReserve();
        return reserve;
    } catch (err) {
        console.error(err);
    }
}
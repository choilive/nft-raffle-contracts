/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
import { Listener, Provider } from "@ethersproject/providers";
import { TypedEventFilter, TypedEvent, TypedListener, OnEvent } from "./common";

export interface IRegistryInterface extends utils.Interface {
  contractName: "IRegistry";
  functions: {
    "approveAllCurrencies()": FunctionFragment;
    "feeInfo(uint256)": FunctionFragment;
    "isApprovedCurrency(address)": FunctionFragment;
    "isPlatformContract(address)": FunctionFragment;
    "setContractStatus(address,bool)": FunctionFragment;
    "setCurrencyStatus(address,bool)": FunctionFragment;
    "setFeeVariables(uint256,uint256)": FunctionFragment;
    "setSystemWallet(address)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "approveAllCurrencies",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "feeInfo",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "isApprovedCurrency",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "isPlatformContract",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "setContractStatus",
    values: [string, boolean]
  ): string;
  encodeFunctionData(
    functionFragment: "setCurrencyStatus",
    values: [string, boolean]
  ): string;
  encodeFunctionData(
    functionFragment: "setFeeVariables",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "setSystemWallet",
    values: [string]
  ): string;

  decodeFunctionResult(
    functionFragment: "approveAllCurrencies",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "feeInfo", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "isApprovedCurrency",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "isPlatformContract",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setContractStatus",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setCurrencyStatus",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setFeeVariables",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setSystemWallet",
    data: BytesLike
  ): Result;

  events: {
    "ContractStatusChanged(address,bool)": EventFragment;
    "CurrencyStatusChanged(address,bool)": EventFragment;
    "FeeVariablesChanged(uint256,uint256)": EventFragment;
    "SystemWalletUpdated(address)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "ContractStatusChanged"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "CurrencyStatusChanged"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "FeeVariablesChanged"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "SystemWalletUpdated"): EventFragment;
}

export type ContractStatusChangedEvent = TypedEvent<
  [string, boolean],
  { changed: string; status: boolean }
>;

export type ContractStatusChangedEventFilter =
  TypedEventFilter<ContractStatusChangedEvent>;

export type CurrencyStatusChangedEvent = TypedEvent<
  [string, boolean],
  { changed: string; status: boolean }
>;

export type CurrencyStatusChangedEventFilter =
  TypedEventFilter<CurrencyStatusChangedEvent>;

export type FeeVariablesChangedEvent = TypedEvent<
  [BigNumber, BigNumber],
  { newFee: BigNumber; newScale: BigNumber }
>;

export type FeeVariablesChangedEventFilter =
  TypedEventFilter<FeeVariablesChangedEvent>;

export type SystemWalletUpdatedEvent = TypedEvent<
  [string],
  { newWallet: string }
>;

export type SystemWalletUpdatedEventFilter =
  TypedEventFilter<SystemWalletUpdatedEvent>;

export interface IRegistry extends BaseContract {
  contractName: "IRegistry";
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: IRegistryInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    approveAllCurrencies(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    feeInfo(
      _salePrice: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[string, BigNumber]>;

    isApprovedCurrency(
      tokenContract: string,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    isPlatformContract(
      toCheck: string,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    setContractStatus(
      toChange: string,
      status: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setCurrencyStatus(
      tokenContract: string,
      status: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setFeeVariables(
      newFee: BigNumberish,
      newScale: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setSystemWallet(
      newWallet: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;
  };

  approveAllCurrencies(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  feeInfo(
    _salePrice: BigNumberish,
    overrides?: CallOverrides
  ): Promise<[string, BigNumber]>;

  isApprovedCurrency(
    tokenContract: string,
    overrides?: CallOverrides
  ): Promise<boolean>;

  isPlatformContract(
    toCheck: string,
    overrides?: CallOverrides
  ): Promise<boolean>;

  setContractStatus(
    toChange: string,
    status: boolean,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setCurrencyStatus(
    tokenContract: string,
    status: boolean,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setFeeVariables(
    newFee: BigNumberish,
    newScale: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setSystemWallet(
    newWallet: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    approveAllCurrencies(overrides?: CallOverrides): Promise<void>;

    feeInfo(
      _salePrice: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[string, BigNumber]>;

    isApprovedCurrency(
      tokenContract: string,
      overrides?: CallOverrides
    ): Promise<boolean>;

    isPlatformContract(
      toCheck: string,
      overrides?: CallOverrides
    ): Promise<boolean>;

    setContractStatus(
      toChange: string,
      status: boolean,
      overrides?: CallOverrides
    ): Promise<void>;

    setCurrencyStatus(
      tokenContract: string,
      status: boolean,
      overrides?: CallOverrides
    ): Promise<void>;

    setFeeVariables(
      newFee: BigNumberish,
      newScale: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    setSystemWallet(
      newWallet: string,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    "ContractStatusChanged(address,bool)"(
      changed?: string | null,
      status?: boolean | null
    ): ContractStatusChangedEventFilter;
    ContractStatusChanged(
      changed?: string | null,
      status?: boolean | null
    ): ContractStatusChangedEventFilter;

    "CurrencyStatusChanged(address,bool)"(
      changed?: string | null,
      status?: boolean | null
    ): CurrencyStatusChangedEventFilter;
    CurrencyStatusChanged(
      changed?: string | null,
      status?: boolean | null
    ): CurrencyStatusChangedEventFilter;

    "FeeVariablesChanged(uint256,uint256)"(
      newFee?: BigNumberish | null,
      newScale?: BigNumberish | null
    ): FeeVariablesChangedEventFilter;
    FeeVariablesChanged(
      newFee?: BigNumberish | null,
      newScale?: BigNumberish | null
    ): FeeVariablesChangedEventFilter;

    "SystemWalletUpdated(address)"(
      newWallet?: null
    ): SystemWalletUpdatedEventFilter;
    SystemWalletUpdated(newWallet?: null): SystemWalletUpdatedEventFilter;
  };

  estimateGas: {
    approveAllCurrencies(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    feeInfo(
      _salePrice: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    isApprovedCurrency(
      tokenContract: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    isPlatformContract(
      toCheck: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    setContractStatus(
      toChange: string,
      status: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setCurrencyStatus(
      tokenContract: string,
      status: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setFeeVariables(
      newFee: BigNumberish,
      newScale: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setSystemWallet(
      newWallet: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    approveAllCurrencies(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    feeInfo(
      _salePrice: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    isApprovedCurrency(
      tokenContract: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    isPlatformContract(
      toCheck: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    setContractStatus(
      toChange: string,
      status: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setCurrencyStatus(
      tokenContract: string,
      status: boolean,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setFeeVariables(
      newFee: BigNumberish,
      newScale: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setSystemWallet(
      newWallet: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;
  };
}

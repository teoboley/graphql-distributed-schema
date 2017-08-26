import { GraphQLFieldConfigArgumentMap, GraphQLObjectType } from "graphql";
import { ModularGraphQL } from "../index";
import generateFields from "./generateFields";

export interface IAssocModelConfig {
	resolve: (child, args, context, info) => any;
	getId?: (obj) => string;
	naming?: {
		element?: (name, itemName, childName) => string;
		singleCheck?: (name, itemName, childType) => string;
		multiCheck?: (name, itemName, childType) => string;
		multiCheckAll?: (name, itemName, childType) => string;
	};
}

export interface IAssocModelConnectionConfig extends IAssocModelConfig {
	getIds: (obj) => string[];
	connection: GraphQLObjectType;
	connectionArgs: GraphQLFieldConfigArgumentMap;
}

export interface IAssocBaseConfig {
	name: string;
	itemName?: string;
	parent: IAssocModelConfig;
	child: IAssocModelConfig;
}

export interface IAssocBothConnectionConfig extends IAssocBaseConfig {
	parent: IAssocModelConnectionConfig;
	child: IAssocModelConnectionConfig;
}

export interface IAssocChildConnectionConfig extends IAssocBaseConfig {
	child: IAssocModelConnectionConfig;
}

export type ConfigType =
	| IAssocBaseConfig // One To One
	| IAssocChildConnectionConfig // One To Many
	| IAssocBothConnectionConfig; // Many To Many

export type ConfigFn = () => ConfigType;

export type IAssociationRawFunction = (
	childKey: string,
	configFn: ConfigFn
) => void;

export function associator(
	parentKey: string,
	modularGQL: ModularGraphQL
): IAssociationRawFunction {
	function associate(childKey: string, configFn: ConfigFn) {
		const parent = modularGQL.type(parentKey);
		const child = modularGQL.type(childKey);

		const generate = generateFields(
			parentKey,
			childKey,
			configFn,
			modularGQL
		);

		parent.extend(() => generate("parent"));

		child.extend(() => generate("child"));
	}

	return associate;
}

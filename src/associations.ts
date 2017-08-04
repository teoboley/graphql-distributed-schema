import {
	GraphQLBoolean,
	GraphQLFieldConfig,
	GraphQLFieldConfigArgumentMap, GraphQLList, GraphQLID, GraphQLNonNull,
	GraphQLObjectType
} from "graphql";
import { ModularGraphQL } from "./index";

enum Relationship {
	OneToOne = "OneToOne",
	OneToMany = "OneToMany",
	ManyToMany = "ManyToMany"
}

export interface IAssociationConfig {
	name: string;
	itemName?: string;
	parentConnection?: any;
	parentConnectionArgs?: GraphQLFieldConfigArgumentMap;
	parentResolveFromChild?: (child, args, context, info) => any;
	childConnection?: any;
	childConnectionArgs?: GraphQLFieldConfigArgumentMap;
	childResolveFromParent?: (parent, args, context, info) => any;
}

export type IAssociationRawFunction = (
	childKey: string,
	config: () => IAssociationConfig
) => void;

export function associator(
	parentKey: string,
	modularGQL: ModularGraphQL
): IAssociationRawFunction {
	return (childKey: string, configFn: () => IAssociationConfig) => {
		const parent = modularGQL.type(parentKey);
		const child = modularGQL.type(childKey);

		parent.extend(() => {
			const config = extractConfig(configFn);
			const itemName = config.itemName || config.name;

			// element field
			const elementField: any = {
				args: config.childConnectionArgs,
				resolve: config.childResolveFromParent
			};

			elementField.type =
				config.relationship == Relationship.OneToOne
					? modularGQL.compiled(childKey)
					: config.childConnection;

			// single check field
			const singleCheckField: GraphQLFieldConfig = {
				type: GraphQLBoolean,
				args: {
					id: {
						type: new GraphQLNonNull(GraphQLID)
					}
				},
				resolve: (parentObj, { id }, context, info) => {
					const childObj = config.childResolveFromParent(parentObj, {}, context, info);

					return (childObj.id === id);
				}
			};

			// multi check field
			const multiCheckField: GraphQLFieldConfig = {
				type: new GraphQLList(GraphQLBoolean),
				args: {
					ids: {
						type: new GraphQLNonNull(new GraphQLList(GraphQLID))
					}
				},
				resolve: (parentObj, { id }, context, info) => {
					const childObj = config.childResolveFromParent(parentObj, {}, context, info);

					// FIXME: Return list
					return (childObj.id === id);
				}
			};

			// multi check all field
			const multiCheckAllField: GraphQLFieldConfig = {
				type: GraphQLBoolean,
				args: {
					ids: {
						type: new GraphQLNonNull(new GraphQLList(GraphQLID))
					}
				},
				resolve: (parentObj, { id }, context, info) => {
					const childObjs = config.childResolveFromParent(parentObj, {}, context, info);

					// FIXME: Return Boolean
					return (childObjs.id === id);
				}
			};

			return {
				// element
				[config.name]: elementField,
				// single check
				[`has${capitalizeFirstLetter(itemName)}`]: singleCheckField,
				// multi check
				[`have${capitalizeFirstLetter(config.name)}`]: multiCheckField,
				// multi check all
				// FIXME: Make more sense grammatically
				[`haveAll${capitalizeFirstLetter(config.name)}`]: multiCheckAllField
			};
		});

		child.extend(() => {
			const config = extractConfig(configFn);
			const itemName = config.itemName || config.name;

			// element field
			const elementField: any = {
				args: config.parentConnectionArgs,
				resolve: config.parentResolveFromChild
			};

			elementField.type =
				config.relationship == Relationship.OneToOne ||
				config.relationship == Relationship.OneToMany
					? modularGQL.compiled(parentKey)
					: config.parentConnection;

			// single check field
			const singleCheckField: GraphQLFieldConfig = {
				type: GraphQLBoolean,
				args: {
					id: {
						type: new GraphQLNonNull(GraphQLID)
					}
				},
				resolve: (childObj, { id }, context, info) => {
					const parentObj = config.parentResolveFromChild(childObj, {}, context, info);

					return (parentObj.id === id);
				}
			};

			// multi check field
			const multiCheckField: GraphQLFieldConfig = {
				type: new GraphQLList(GraphQLBoolean),
				args: {
					ids: {
						type: new GraphQLNonNull(new GraphQLList(GraphQLID))
					}
				},
				resolve: (childObj, { id }, context, info) => {
					const parentObj = config.parentResolveFromChild(childObj, {}, context, info);

					// FIXME: Return List
					return (parentObj.id === id);
				}
			};

			// multi check all field
			const multiCheckAllField: GraphQLFieldConfig = {
				type: GraphQLBoolean,
				args: {
					ids: {
						type: new GraphQLNonNull(new GraphQLList(GraphQLID))
					}
				},
				resolve: (childObj, { id }, context, info) => {
					const parentObjs = config.parentResolveFromChild(childObj, {}, context, info);

					// FIXME: Return Boolean
					return (parentObjs.id === id);
				}
			};

			return {
				// element
				[`${itemName}Of${capitalizeFirstLetter(
					modularGQL.type(parentKey).name
				)}`]: elementField,
				// single check
				[`is${capitalizeFirstLetter(itemName)}Of${capitalizeFirstLetter(
					modularGQL.type(parentKey).name
				)}`]: singleCheckField,
				// multi check
				[`is${capitalizeFirstLetter(itemName)}Of${capitalizeFirstLetter(
					modularGQL.type(parentKey).name
				)}s`]: multiCheckField,
				// TODO: multi check all
				[`is${capitalizeFirstLetter(itemName)}OfAll${capitalizeFirstLetter(
					modularGQL.type(parentKey).name
				)}s`]: multiCheckAllField
			};
		});
	};
}

interface IExtractedConfig extends IAssociationConfig {
	relationship: Relationship;
}

function extractConfig(configFn: () => IAssociationConfig): IExtractedConfig {
	const extractedConfig = configFn();

	let relationship = Relationship.OneToOne;

	if (extractedConfig.parentConnection) {
		relationship = Relationship.ManyToMany;
	} else if (extractedConfig.childConnection) {
		relationship = Relationship.OneToMany;
	}

	return {
		...extractedConfig,
		relationship
	}
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function resolveCompiledFromTypeOrString(
	keyOrObject: object | string,
	modularGQL: ModularGraphQL
) {
	if (typeof keyOrObject === "string") {
		return modularGQL.compiled(keyOrObject);
	} else {
		return keyOrObject;
	}
}

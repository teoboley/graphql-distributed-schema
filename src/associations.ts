import {
	GraphQLBoolean,
	GraphQLFieldConfig,
	GraphQLFieldConfigArgumentMap, GraphQLList, GraphQLID, GraphQLNonNull,
	GraphQLObjectType
} from "graphql";
import * as deepMerge from "deepmerge";
import { ModularGraphQL } from "./index";

enum Relationship {
	OneToOne = "OneToOne",
	OneToMany = "OneToMany",
	ManyToMany = "ManyToMany"
}

export interface IAssociationConfig {
	name: string;
	itemName?: string;

	parent: {
		connection?: any;
		connectionArgs?: GraphQLFieldConfigArgumentMap;
		resolveFromChild?: (child, args, context, info) => any;
		namingFormulae?: {
			element?: (name, itemName, childName) => string;
			singleCheck?: (name, itemName, childType) => string;
			multiCheck?: (name, itemName, childType) => string;
			multiCheckAll?: (name, itemName, childType) => string;
		}
	};

	child: {
		connection?: any;
		connectionArgs?: GraphQLFieldConfigArgumentMap;
		resolveFromParent?: (parent, args, context, info) => any;
		namingFormulae?: {
			element?: (name, itemName, parentType) => string;
			singleCheck?: (name, itemName, parentType) => string;
			multiCheck?: (name, itemName, parentType) => string;
			multiCheckAll?: (name, itemName, parentType) => string;
		}
	}
}

export type IAssociationRawFunction = (
	childKey: string,
	config: () => IAssociationConfig
) => void;

const defaultConfig: IAssociationConfig = {
	name: "",
	parent: {
		namingFormulae: {
			element: (name) => name,
			singleCheck: (name, itemName) => `has${capitalizeFirstLetter(itemName)}`,
			multiCheck: (name) => `have${capitalizeFirstLetter(name)}`,
			multiCheckAll: (name) => `haveAll${capitalizeFirstLetter(name)}`
		}
	},
	child: {
		namingFormulae: {
			element: (name, itemName, parentName) => `${itemName}Of${capitalizeFirstLetter(parentName)}`,
			singleCheck: (name, itemName, parentName) =>
				`is${capitalizeFirstLetter(itemName)}Of${capitalizeFirstLetter(parentName)}`,
			multiCheck: (name, itemName, parentName) =>
				`is${capitalizeFirstLetter(itemName)}Of${capitalizeFirstLetter(parentName)}s`,
			multiCheckAll: (name, itemName, parentName) =>
				`is${capitalizeFirstLetter(itemName)}OfAll${capitalizeFirstLetter(parentName)}s`
		}
	}
};

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
				args: config.child.connectionArgs,
				resolve: config.child.resolveFromParent
			};

			elementField.type =
				config.relationship == Relationship.OneToOne
					? modularGQL.compiled(childKey)
					: config.child.connection;

			// single check field
			const singleCheckField: GraphQLFieldConfig = {
				type: GraphQLBoolean,
				args: {
					id: {
						type: new GraphQLNonNull(GraphQLID)
					}
				},
				resolve: (parentObj, { id }, context, info) => {
					const childObj = config.child.resolveFromParent(parentObj, {}, context, info);

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
					const childObj = config.child.resolveFromParent(parentObj, {}, context, info);

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
					const childObjs = config.child.resolveFromParent(parentObj, {}, context, info);

					// FIXME: Return Boolean
					return (childObjs.id === id);
				}
			};

			const childName = modularGQL.type(childKey).name;

			return {
				// element
				[config.parent.namingFormulae.element(
					config.name,
					itemName,
					childName)]: elementField,
				// single check
				[config.parent.namingFormulae.singleCheck(
					config.name,
					itemName,
					childName)]: singleCheckField,
				// multi check
				[config.parent.namingFormulae.multiCheck(
					config.name,
					itemName,
					childName)]: multiCheckField,
				// multi check all
				// FIXME: Make more sense grammatically
				[config.parent.namingFormulae.multiCheckAll(
					config.name,
					itemName,
					childName)]: multiCheckAllField
			};
		});

		child.extend(() => {
			const config = extractConfig(configFn);
			const itemName = config.itemName || config.name;

			// element field
			const elementField: any = {
				args: config.parent.connectionArgs,
				resolve: config.parent.resolveFromChild
			};

			elementField.type =
				config.relationship == Relationship.OneToOne ||
				config.relationship == Relationship.OneToMany
					? modularGQL.compiled(parentKey)
					: config.parent.connection;

			// single check field
			const singleCheckField: GraphQLFieldConfig = {
				type: GraphQLBoolean,
				args: {
					id: {
						type: new GraphQLNonNull(GraphQLID)
					}
				},
				resolve: (childObj, { id }, context, info) => {
					const parentObj = config.parent.resolveFromChild(childObj, {}, context, info);

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
					const parentObj = config.parent.resolveFromChild(childObj, {}, context, info);

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
					const parentObjs = config.parent.resolveFromChild(childObj, {}, context, info);

					// FIXME: Return Boolean
					return (parentObjs.id === id);
				}
			};

			const parentName = modularGQL.type(parentKey).name;

			return {
				// element
				[config.child.namingFormulae.element(
					config.name,
					itemName,
					parentName)]: elementField,
				// single check
				[config.child.namingFormulae.singleCheck(
					config.name,
					itemName,
					parentName)]: singleCheckField,
				// multi check
				[config.child.namingFormulae.multiCheck(
					config.name,
					itemName,
					parentName)]: multiCheckField,
				// multi check all
				[config.child.namingFormulae.multiCheckAll(
					config.name,
					itemName,
					parentName)]: multiCheckAllField
			};
		});
	};
}

interface IExtractedConfig extends IAssociationConfig {
	relationship: Relationship;
}

function extractConfig(configFn: () => IAssociationConfig): IExtractedConfig {
	const config = deepMerge(defaultConfig, configFn());

	let relationship = Relationship.OneToOne;

	if (config.parent.connection) {
		relationship = Relationship.ManyToMany;
	} else if (config.child.connection) {
		relationship = Relationship.OneToMany;
	}

	return {
		...config,
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

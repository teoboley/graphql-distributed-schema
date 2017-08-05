import {
	GraphQLBoolean,
	GraphQLFieldConfig,
	GraphQLFieldConfigArgumentMap,
	GraphQLList,
	GraphQLID,
	GraphQLNonNull,
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
		index?: string;
		namingFormulae?: {
			element?: (name, itemName, childName) => string;
			singleCheck?: (name, itemName, childType) => string;
			multiCheck?: (name, itemName, childType) => string;
			multiCheckAll?: (name, itemName, childType) => string;
		};
	};

	child: {
		connection?: any;
		connectionArgs?: GraphQLFieldConfigArgumentMap;
		resolveFromParent?: (parent, args, context, info) => any;
		index?: string;
		namingFormulae?: {
			element?: (name, itemName, parentType) => string;
			singleCheck?: (name, itemName, parentType) => string;
			multiCheck?: (name, itemName, parentType) => string;
			multiCheckAll?: (name, itemName, parentType) => string;
		};
	};
}

export type IAssociationRawFunction = (
	childKey: string,
	config: () => IAssociationConfig
) => void;

const defaultConfig: IAssociationConfig = {
	name: "",
	parent: {
		index: "id",
		namingFormulae: {
			element: name => name,
			singleCheck: (name, itemName) =>
				`has${capitalizeFirstLetter(itemName)}`,
			multiCheck: (name, itemName) => `has${capitalizeFirstLetter(name)}`,
			multiCheckAll: (name, itemName) => `hasAll${capitalizeFirstLetter(name)}`
		}
	},
	child: {
		index: "id",
		namingFormulae: {
			element: (name, itemName, parentName) =>
				`${itemName}Of${capitalizeFirstLetter(parentName)}`,
			singleCheck: (name, itemName, parentName) =>
				`is${capitalizeFirstLetter(itemName)}Of${capitalizeFirstLetter(
					parentName
				)}`,
			multiCheck: (name, itemName, parentName) =>
				`is${capitalizeFirstLetter(itemName)}Of${capitalizeFirstLetter(
					parentName
				)}s`,
			multiCheckAll: (name, itemName, parentName) =>
				`is${capitalizeFirstLetter(
					itemName
				)}OfAll${capitalizeFirstLetter(parentName)}s`
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
			const childName = modularGQL.type(childKey).name;

			const fields = {};

			// element field
			const elementField: any = {
				description: "element field",
				args: config.child.connectionArgs,
				resolve: config.child.resolveFromParent
			};

			elementField.type =
				config.relationship == Relationship.OneToOne
					? modularGQL.compiled(childKey)
					: config.child.connection;

			fields[config.parent.namingFormulae.element(
				config.name,
				itemName,
				childName
			)] = elementField;

			// single check field
			fields[config.parent.namingFormulae.singleCheck(
				config.name,
				itemName,
				childName
			)] = {
				type: GraphQLBoolean,
				description: "single check field",
				args: {
					id: {
						type: new GraphQLNonNull(GraphQLID)
					}
				},
				resolve: (parentObj, { id }, context, info) => {
					const childObj = config.child.resolveFromParent(
						parentObj,
						{},
						context,
						info
					);

					return childObj[config.child.index] === id;
				}
			};

			if (config.relationship !== Relationship.OneToOne) {
				// multi check field
				fields[config.parent.namingFormulae.multiCheck(
					config.name,
					itemName,
					childName
				)] = {
					type: new GraphQLList(GraphQLBoolean),
					description: "multi check field",
					args: {
						ids: {
							type: new GraphQLNonNull(new GraphQLList(GraphQLID))
						}
					},
					resolve: (parentObj, { id }, context, info) => {
						const childObj = config.child.resolveFromParent(
							parentObj,
							{},
							context,
							info
						);

						// FIXME: Return list
						return childObj[config.child.index] === id;
					}
				};

				// multi check all field
				fields[config.parent.namingFormulae.multiCheckAll(
					config.name,
					itemName,
					childName
				)] = {
					type: GraphQLBoolean,
					description: "multi check all field",
					args: {
						ids: {
							type: new GraphQLNonNull(new GraphQLList(GraphQLID))
						}
					},
					resolve: (parentObj, { id }, context, info) => {
						const childObjs = config.child.resolveFromParent(
							parentObj,
							{},
							context,
							info
						);

						// FIXME: Return Boolean
						return childObjs[config.child.index] === id;
					}
				};
			}

			return fields;
		});

		child.extend(() => {
			const config = extractConfig(configFn);
			const itemName = config.itemName || config.name;
			const parentName = modularGQL.type(parentKey).name;

			const fields = {};

			// element field
			const elementField: any = {
				description: "element field",
				args: config.parent.connectionArgs,
				resolve: config.parent.resolveFromChild
			};

			elementField.type =
				config.relationship == Relationship.OneToOne ||
				config.relationship == Relationship.OneToMany
					? modularGQL.compiled(parentKey)
					: config.parent.connection;

			fields[config.child.namingFormulae.element(
				config.name,
				itemName,
				parentName
			)] = elementField;

			// single check field
			const singleCheckField: GraphQLFieldConfig = {
				type: GraphQLBoolean,
				description: "single check field",
				args: {
					id: {
						type: new GraphQLNonNull(GraphQLID)
					}
				},
				resolve: (childObj, { id }, context, info) => {
					const parentObj = config.parent.resolveFromChild(
						childObj,
						{},
						context,
						info
					);

					return parentObj[config.parent.index] === id;
				}
			};

			fields[config.child.namingFormulae.singleCheck(
				config.name,
				itemName,
				parentName
			)] = singleCheckField;

			if (config.relationship === Relationship.ManyToMany) {
				// multi check field
				fields[config.child.namingFormulae.multiCheck(
					config.name,
					itemName,
					parentName
				)] = {
					type: new GraphQLList(GraphQLBoolean),
					description: "multi check field",
					args: {
						ids: {
							type: new GraphQLNonNull(new GraphQLList(GraphQLID))
						}
					},
					resolve: (childObj, { id }, context, info) => {
						const parentObj = config.parent.resolveFromChild(
							childObj,
							{},
							context,
							info
						);

						// FIXME: Return List
						return parentObj[config.parent.index] === id;
					}
				};

				// multi check all field
				fields[config.child.namingFormulae.multiCheckAll(
					config.name,
					itemName,
					parentName
				)] = {
					type: GraphQLBoolean,
					description: "multi check all field",
					args: {
						ids: {
							type: new GraphQLNonNull(new GraphQLList(GraphQLID))
						}
					},
					resolve: (childObj, { id }, context, info) => {
						const parentObjs = config.parent.resolveFromChild(
							childObj,
							{},
							context,
							info
						);

						// FIXME: Return Boolean
						return parentObjs[config.parent.index] === id;
					}
				};
			}

			return fields;
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
	};
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
